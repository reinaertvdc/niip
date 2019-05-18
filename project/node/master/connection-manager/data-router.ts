#!/usr/bin/env ts-node

import * as CM from './connection-manager';
import * as BSON from 'bson';
import { Pool } from 'pg';
import { MQTT } from './mqtt-helper';
// import {Client as MClient, connect as Mconnect, Packet} from 'mqtt';
import { sleep } from './sleep-util';

import uuidv4 from 'uuid/v4';


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

    private toJsonObject(): {stream: string, timestamp: number, data: {}} {
        let tmp: {stream: string, timestamp: number, data: {}} = {
            stream: this._uuid,
            timestamp: this._timestamp,
            data: this._data,
        }
        return tmp;
    }

    public get json(): string {
        return JSON.stringify(this.toJsonObject());
    }

    public get bson(): Buffer {
        return BSON.serialize(this.toJsonObject());
    }
    
}


export class DataRouter {

    private _buffer: DataBuffer = new DataBuffer(PG_USER, PG_PASSWORD, PG_DATABASE, PG_HOST, PG_PORT);
    private _cm: CM.ConnectionManager;

    private _mqtt: MQTT;

    private _connectionAvailable: boolean = false;
    private _connectionChanged: boolean = false;
    private _connectionCanUseMqtt: boolean = false;

    public constructor()
    public constructor(wifiIface: string|number|null)
    public constructor(cm: CM.ConnectionManager)
    public constructor(arg: CM.ConnectionManager|string|number|null = null) {
        if (arg === null) {
            this._cm = new CM.ConnectionManager();
        }
        else if (arg instanceof CM.ConnectionManager) {
            this._cm = arg;
        }
        else {
            this._cm = new CM.ConnectionManager(arg);
        }
        this._cm.on('connect', this.cmConnectCallback.bind(this));
        this._mqtt = new MQTT('mqtts://mqtt.logitrack.tk', {
            username: 'cwout',
            clientId: 'cwout',
            password: 'test123',
            clean: false,
        });
        this.sendLoop();
    }

    private cmConnectCallback(ap:CM.AP|null,net:CM.Network|null,newConnection:boolean): void {
        if (ap === null || net === null || newConnection) {
            this._mqtt.disconnect();
        }
    }

    public get connectionManager(): Readonly<CM.ConnectionManager> {
        return this._cm;
    }

    public async send(data: Data): Promise<boolean> {
        let inserted: boolean = await this._buffer.push(data);
        return inserted;
    }

    private async sendLoop(): Promise<void> {
        while (true) {
            // this._sendLoopActive = true;
            await sleep(0);
            if (this._cm.lastConnectedAP === null || this._cm.lastConnectedNetwork === null) {
                console.log('Data Router - No connection detected - pausing')
                await sleep(1000);
                console.log('Data Router - resuming')
                continue;
            }
            let minU: DataUrgency = DataUrgency.WHENEVER;
            let needsMqttClient: boolean = true;
            let needsLoraClient: boolean = false;
            if (this._cm.lastConnectedAP.type === CM.APtype.UNDEFINED) {
                console.log('Data Router - Current connection type unknown - pausing')
                await sleep(1000);
                console.log('Data Router - resuming')
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
                needsMqttClient = false;
                needsLoraClient = true;
            }
            let data: Array<Data> = await this._buffer.peek(minU, DataUrgency.ASAP, 5000);
            if (data.length === 0) {
                console.log('Data Router - No data to send on current connection - pausing')
                await sleep(1000);
                console.log('Data Router - resuming')
                continue;
            }
            if (needsMqttClient) {
                if (!await this._mqtt.connect()) {
                    console.log('Data Router - MQTT client no connected - pausing')
                    await sleep(1000);
                    console.log('Data Router - resuming')
                    continue;
                }
            }
            if (needsLoraClient) {
                console.log('Data Router - LORA client required on connection - Not implemented yet');
                continue;
                //TODO: implement lora client
            }
            console.log('Data Router - Sending');;
            let dataArray: Array<Buffer> = [];
            for (let i: number = 0; i < data.length; i++) {
                dataArray.push(data[i].bson);
            }
            // console.log('SENDING [ 0 , ' + (data.length -1) + ' ]');
            let sendResult: Array<boolean> = await this._mqtt.publishAll('0/data', dataArray, 1);
            for (let i: number = 0; i < data.length && i < sendResult.length; i++) {
                if (sendResult[i] === true) {
                    // console.log('DELETING ' + i);
                    let id: number|null = data[i].id;
                    if (id !== null) {
                        this._buffer.remove([id]);
                    }
                }
            }
        }
    }

}


class DataBuffer {

    private _pg: Pool;

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
        await sleep(1000);
        return true;
    }

    //TODO: return grouped data
    public async peek(minUrgency: DataUrgency = DataUrgency.WHENEVER, maxUrgency: DataUrgency = DataUrgency.ASAP, count: number = 100): Promise<Array<Data>> {
        const client = await this._pg.connect();
        let ret: Array<Data> = [];
        let curU: DataUrgency = maxUrgency;
        while (curU >= minUrgency && ret.length < count) {
            try {
                let result = await client.query('select id, stream, date_part(\'epoch\',timestamp) as timestamp, data, urgency from buffer where urgency = $1 order by id fetch first $2 rows only;', [curU, count-ret.length]);
                for (let i: number = 0; i < result.rows.length; i++) {
                    let tmp: {id: number, stream: string, timestamp: number, data: Object, urgency: DataUrgency} = result.rows[i];
                    let data: Data = new Data(tmp.stream, tmp.timestamp, tmp.data, tmp.urgency, tmp.id);
                    ret.push(data);
                }
            } catch (e) {
                console.error(e);
            }
            curU--;
        }
        client.release();
        return ret;
    }

    public async remove(ids: Array<number>): Promise<void> {
        if (ids.length === 0) { return; }
        for (let i: number = 0; i < ids.length; i++) {
            let id: number|null = ids[i];
            if (id === null) { continue; }
            let qs: string = 'DELETE FROM buffer WHERE id=' + id;
            const client = await this._pg.connect();
            try {
                await client.query(qs);
            } catch (e) {
                console.error(e);
            }
            client.release();
        }
    }

}

let cm: CM.ConnectionManager = new CM.ConnectionManager(0, null, null, 5000);
let dr = new DataRouter(cm);

dr.connectionManager.addAP(new CM.AP(CM.APtype.HOTSPOT, 'cw-2.4', '9edFrBDobS', 5, 120));
dr.connectionManager.addAP(new CM.AP(CM.APtype.HOTSPOT, 'telenet-A837A-extended', '57735405', 5, 50));
dr.connectionManager.addAP(new CM.AP(CM.APtype.WIFI, 'XT1635-02 4458', 'shagra2018', 0, 5000));

setTimeout(()=>{
    for (let i: number = 0; i < 50; i++) {
        dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.HIGHCOST));
    }
    for (let i: number = 0; i < 5000; i++) {
        dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
    }
}, 5000);