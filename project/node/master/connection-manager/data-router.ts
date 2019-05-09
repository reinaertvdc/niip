#!/usr/bin/env ts-node

import * as CM from './connection-manager';
// import {ByteBuffer, ByteBufferPool} from './byte-buffer';
import * as BSON from 'bson';
import {Client, Pool} from 'pg';

const uuidv4 = require('uuid/v4');


const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PG_USER = 'logitrack';
const PG_PASSWORD = 'logitrack';
const PG_DATABASE = 'logitrack';


export enum DataUrgency {
    WHENEVER = 0,
    LOWCOST,
    HIGHCOST,
    ASAP
}


export class Data {

    private _id: number|null;
    private _uuid: string;
    private _timestamp: number;
    private _data: {};
    private _urgency: DataUrgency = DataUrgency.WHENEVER;

    public constructor(streamUuid: string, timestamp: number,data: {}, urgency: DataUrgency = DataUrgency.WHENEVER, id: number|null = null) {
        this._id = id;
        this._uuid = streamUuid;
        this._timestamp = timestamp;
        this._data = data;
        this._urgency = urgency;
    }

    public get id(): number|null {
        return this._id;
    }

    public get streamUuid(): string {
        return this._uuid;
    }

    public get timestamp(): number {
        return this._timestamp;
    }

    public get urgency(): DataUrgency {
        return this._urgency;
    }

    public get data(): {} {
        return this._data;
    }

    public get json(): string {
        return JSON.stringify(this._data);
    }

    public get bson(): Buffer {
        return BSON.serialize(this._data);
    }
    
}


export class DataRouter {

    private _buffer: DataBuffer = new DataBuffer(PG_USER, PG_PASSWORD, PG_DATABASE, PG_HOST, PG_PORT);
    // private _pool: ByteBufferPool = new ByteBufferPool();
    private _cm: CM.ConnectionManager;

    public constructor(cm: CM.ConnectionManager|null = null) {
        if (cm !== null) {
            this._cm = cm;
        }
        else {
            this._cm = new CM.ConnectionManager();
        }
        this._cm.on('connect', this.cmConnectCallback);
        this.sendLoop();
    }

    private cmConnectCallback(ap:CM.AP|null,net:CM.Network|null,newConnection:boolean): void {
        if (ap !== null && net !== null) {
            // console.log('CONNECT TRIGGERED ' + ap.ssid);
            if (newConnection) {
                // console.log('\treconnect')
            }
        }
    }

    public get connectionManager(): Readonly<CM.ConnectionManager> {
        return this._cm;
    }

    // public get pool(): Readonly<ByteBufferPool> {
    //     return this._pool;
    // }

    public async send(data: Data): Promise<boolean> {
        let inserted: boolean = await this._buffer.push(data);
        return inserted;
    }

    private async sleep(millis: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(()=>{
                resolve();
            }, millis);
        });
    }

    private async sendLoop(): Promise<void> {
        while (true) {
            await this.sleep(0);
            if (this._cm.lastConnectedAP === null || this._cm.lastConnectedNetwork === null) {
                console.log('Data Router - No connection detected - pausing')
                await this.sleep(5000);
                console.log('Data Router - No connection detected - resuming')
                continue;
            }
            let minU: DataUrgency = DataUrgency.WHENEVER;
            if (this._cm.lastConnectedAP.type === CM.APtype.UNDEFINED) {
                console.log('Data Router - Current connection type unknown - pausing')
                await this.sleep(5000);
                console.log('Data Router - Current connection type unknown - resuming')
                continue;
            }
            else if (this._cm.lastConnectedAP.type === CM.APtype.WIFI) {
                minU = DataUrgency.WHENEVER;
            }
            else if (this._cm.lastConnectedAP.type === CM.APtype.HOTSPOT) {
                if (this._cm.lastConnectedAP.cost <= 5) {
                    minU = DataUrgency.LOWCOST;
                }
                else {
                    minU = DataUrgency.HIGHCOST;
                }
            }
            else if (this._cm.lastConnectedAP.type === CM.APtype.LORA) {
                minU = DataUrgency.ASAP;
            }
            let data: Array<Data> = await this._buffer.peek(minU);
            if (data.length === 0) {
                console.log('Data Router - No data to send on current connection - pausing')
                await this.sleep(1000);
                console.log('Data Router - No data to send on current connection - resuming')
                continue;
            }
            console.log('Data Router - Sending');
            // console.log(data.bson);
            //TODO: actually send data
            // this._buffer.poll();
        }
    }

}


class DataBuffer {

    private _pg: Pool;
    // private _pgConnected: boolean = false;

    // private _bufferWhenever: Array<Data> = [];
    // private _bufferLowCost: Array<Data> = [];
    // private _bufferHighCost: Array<Data> = [];
    // private _bufferAsap: Array<Data> = [];

    public constructor(pgUser: string, pgPassword: string, pgDatabase: string, pgHost: string = 'localhost', pgPort: number = 5432) {
        this._pg = new Pool({
            host: pgHost,
            port: pgPort,
            user: pgUser,
            password: pgPassword,
            database: pgDatabase,
        });
    }

    public async push(data: Data): Promise<boolean> {
        const client = await this._pg.connect();
        let insertedId: number = -1;
        try {
            let result = await client.query('INSERT INTO buffer (stream,timestamp,data,urgency) VALUES ($1, to_timestamp($2), $3, $4) RETURNING id', [data.streamUuid, data.timestamp, data.json, data.urgency]);
            if (result.rows.length > 0) {
                insertedId = result.rows[0].id;
            }
        } catch (e) {
            console.error(e);
        }
        client.release()
        if (insertedId < 0) {
            return false;
        }
        console.log(insertedId);
        return true;
        
        // if (data.urgency === DataUrgency.WHENEVER) {
        //     this._bufferWhenever.push(data);
        // }
        // else if (data.urgency === DataUrgency.LOWCOST) {
        //     this._bufferWhenever.push(data);
        // }
        // else if (data.urgency === DataUrgency.HIGHCOST) {
        //     this._bufferWhenever.push(data);
        // }
        // else if (data.urgency === DataUrgency.ASAP) {
        //     this._bufferWhenever.push(data);
        // }
    }

    public async peek(minUrgency: DataUrgency = DataUrgency.WHENEVER, maxUrgency: DataUrgency = DataUrgency.ASAP, count: number = 100): Promise<Array<Data>> {
        const client = await this._pg.connect();
        let ret: Array<Data> = [];
        let curU: DataUrgency = maxUrgency;
        while (curU >= minUrgency && ret.length < count) {
            try {
                //TODO: change count
                let result = await client.query('select id, stream, date_part(\'epoch\',timestamp) as timestamp, data, urgency from buffer where urgency > $1 order by id fetch first $2 rows only;', [curU, count]);
                console.log(result.rows);
            } catch (e) {
                console.error(e);
            }
            //TODO
        }
        client.release()
        return ret;
    }

    //TODO: implement delete

    // public poll(minUrgency: DataUrgency = DataUrgency.WHENEVER): Data|null {
    //     if (this._bufferAsap.length > 0) {
    //         let tmp: Data|undefined = this._bufferAsap.shift();
    //         if (tmp instanceof Data) return tmp;
    //         else return null;
    //     }
    //     else if (minUrgency <= DataUrgency.HIGHCOST && this._bufferHighCost.length > 0) {
    //         let tmp: Data|undefined = this._bufferHighCost.shift();
    //         if (tmp instanceof Data) return tmp;
    //         else return null;
    //     }
    //     else if (minUrgency <= DataUrgency.LOWCOST && this._bufferLowCost.length > 0) {
    //         let tmp: Data|undefined = this._bufferLowCost.shift();
    //         if (tmp instanceof Data) return tmp;
    //         else return null;
    //     }
    //     else if (minUrgency <= DataUrgency.WHENEVER && this._bufferWhenever.length > 0) {
    //         let tmp: Data|undefined = this._bufferWhenever.shift();
    //         if (tmp instanceof Data) return tmp;
    //         else return null;
    //     }
    //     return null;
    // }

}

let cm: CM.ConnectionManager = new CM.ConnectionManager(5000);
let dr = new DataRouter(cm);

dr.connectionManager.addAP(new CM.AP(CM.APtype.WIFI, 'cw-2.4', '9edFrBDobS', 0, 120));
dr.connectionManager.addAP(new CM.AP(CM.APtype.WIFI, 'telenet-A837A-extended', '57735405', 0, 50));
dr.connectionManager.addAP(new CM.AP(CM.APtype.HOTSPOT, 'XT1635-02 4458', 'shagra2018', 10, 5));

setTimeout(()=>{
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
}, 5000);