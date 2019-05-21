import * as CM from './connection-manager';
import { Pool } from 'pg';
import { MQTT } from './mqtt-helper';
import { sleep } from './sleep-util';
import { NumericBase64 } from './base64-helper'
import { DataProvider } from '../data-provider/data-provider';
import { readFile } from 'fs';


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
    private _timestamp: number;
    private _data: {};
    private _urgency: DataUrgency = DataUrgency.WHENEVER;

    public constructor(timestamp: number,data: {}, urgency: DataUrgency = DataUrgency.WHENEVER, id: number|null = null) {
        this._id = id;
        this._timestamp = timestamp;
        this._data = data;
        this._urgency = urgency;
    }

    public get id(): number|null {
        return this._id;
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

    private toJsonObject(): {timestamp: number, data: {}} {
        let tmp: {timestamp: number, data: {}} = {
            timestamp: this._timestamp,
            data: this._data,
        }
        return tmp;
    }

    public get jsonString(): string {
        return JSON.stringify(this.toJsonObject());
    }

    public get jsonBuffer(): Buffer {
        return Buffer.from(this.jsonString);
    }
    
}


export class DataRouter {

    private _buffer: DataBuffer = new DataBuffer(PG_USER, PG_PASSWORD, PG_DATABASE, PG_HOST, PG_PORT);
    private _cm: CM.ConnectionManager;

    private _mqtt: MQTT;

    private _username: string;
    private _clientid: string;
    private _password: string;
    private _basetopic: string;
    private _subtopicup: string;
    private _subtopicdown: string;

    public constructor(clientid: number, password: string)
    public constructor(clientid: number, password: string, wifiIfacePrimary: Array<string>)
    public constructor(clientid: number, password: string, cm: CM.ConnectionManager)
    public constructor(clientid: number, password: string, arg: CM.ConnectionManager|Array<string>|null = null) {
        this._username = NumericBase64.fromNumber(clientid);
        this._clientid = NumericBase64.fromNumber(clientid);
        this._password = password;
        this._basetopic = NumericBase64.fromNumber(clientid);
        this._subtopicup = 'u';
        this._subtopicdown = 'd';
        if (arg === null) {
            this._cm = new CM.ConnectionManager(null, null);
        }
        else if (arg instanceof CM.ConnectionManager) {
            this._cm = arg;
        }
        else {
            this._cm = new CM.ConnectionManager(arg);
        }
        this._cm.on('connect', this.cmConnectCallback.bind(this));
        this._mqtt = new MQTT('mqtts://logitrack.tk', {
            username: this._username,
            clientId: this._clientid,
            password: this._password,
            clean: false,
        });
        //TODO: change callback
        this._mqtt.subscribe(this._basetopic + '/' + this._subtopicdown, 2, (topic: string, payload:Buffer)=>{
            console.log(payload);
        }).then((val:boolean)=>{
            this.pollLoop();
            this.sendLoop();
        });
        this.initializeApsFromFile('ap.json');
    }

    private initializeApsFromFile(filename: string) {
        readFile(filename, 'ascii', ((err: NodeJS.ErrnoException, data: string)=>{
            if (err) {
                console.error(err);
                return;
            }
            let o: Array<{type:'wifi'|'hotspot'|'lora',ssid:string,psk:string,cost:number,speed:number}> = [];
            try {
                o = JSON.parse(data);
            } catch (e) {
                console.error(e);
                return;
            }
            if (typeof o !== 'object' || !(o instanceof Array)) {
                return;
            }
            let aps: Array<CM.AP> = [];
            for (let i: number = 0; i < o.length; i++) {
                if (typeof o[i] !== 'object' || o[i] instanceof Array
                        || !(o[i] instanceof Object)) { continue; }
                if (o[i].type === undefined || typeof o[i].type !== 'string'
                        || !['wifi','hotspot','lora'].includes(o[i].type)) { continue; }
                if (o[i].ssid === undefined || typeof o[i].ssid !== 'string') { continue; }
                if (o[i].psk === undefined || typeof o[i].psk !== 'string') { continue; }
                if (o[i].cost === undefined || typeof o[i].cost !== 'number') { continue; }
                if (o[i].speed === undefined || typeof o[i].speed !== 'number') { continue; }
                let t: CM.APtype = CM.APtype.UNDEFINED;
                if (o[i].type === 'wifi') { t = CM.APtype.WIFI; }
                else if (o[i].type === 'hotspot') { t = CM.APtype.HOTSPOT; }
                else if (o[i].type === 'lora') { t = CM.APtype.LORA; }
                if (t === CM.APtype.UNDEFINED) { continue; }
                aps.push(new CM.AP(t, o[i].ssid, o[i].psk, o[i].cost, o[i].speed));
            }
            for (let i: number = 0; i < aps.length; i++) {
                this._cm.addAP(aps[i]);
            }
        }).bind(this));
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

    private async pollLoop(): Promise<void> {
        let provider = DataProvider.getInstance();
        let sourcesMap = provider.getSources();
        let sources: string[] = [];
        for (let i: number = 0; i < sourcesMap.length; i++) {
            sources.push(sourcesMap[i].key);
        }
        let tmp: {} = await provider.getMultipleData(sources);
        let timestamp: number = Date.now();
        let data: Data = new Data(timestamp, tmp);
        this.send(data);
        provider.on('new-data', ((key:string)=>{
            provider.getData(key).then(((tmp: {})=>{
                let timestamp: number = Date.now();
                let actualData = {};
                actualData[key] = tmp;
                let data: Data = new Data(timestamp, actualData);
                this.send(data);
            }).bind(this));
        }).bind(this));
    }

    private async sendLoop(): Promise<void> {
        while (true) {
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
            let data: Array<Data> = await this._buffer.peek(minU, DataUrgency.ASAP, 10);
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
                dataArray.push(data[i].jsonBuffer);
            }
            let sendResult: Array<boolean> = await this._mqtt.publishAll(this._basetopic + '/' + this._subtopicup, dataArray, 2);
            for (let i: number = 0; i < data.length && i < sendResult.length; i++) {
                if (sendResult[i] === true) {
                    let id: number|null = data[i].id;
                    if (id !== null) {
                        this._buffer.remove([id]);
                    }
                }
            }
        }
    }

}


// class DataGrouper {
//     private constructor() {}
//     public static group(data: Array<Data>): Buffer {
//         if (data.length === 0) { return Buffer.from('', 'ascii'); }
//         data.sort((a,b)=>(a.timestamp > b.timestamp) ? 1 : -1);
//         let start: number = data[0].timestamp;
//         let offsets: Array<number> = [];
//         let g = {};
//         g['start'] = start;
//         g['data'] = {};
//         offsets[0] = 0;
//         for (let i: number = 1; i < data.length; i++) {
//             offsets.push(data[i].timestamp - start);
//         }
//         for (let i: number = 0; i < data.length; i++) {
//             let d = data[i];
//             let keys = Object.keys(d.data);
//             for (let j:number = 0; j < keys.length; j++) {
//                 let key = keys[j];
//                 if (g['data'][key] === undefined) { g['data'][key] = {values:[],deltas:[]}; }
//                 g['data'][key].values.push(d.data[key]);
//                 g['data'][key].deltas.push(offsets[i]);
//             }
//         }
//         let keys = Object.keys(g['data']);
//         for (let i: number = 0; i < keys.length; i++) {
//             let key = keys[i];
//             for (let j: number = g['data'][key].deltas.length - 1; j > 0; j--) {
//                 g['data'][key].deltas[j] = g['data'][key].deltas[j] - g['data'][key].deltas[j-1];
//             }
//         }
//         return BSON.serialize(g);
//     }
// }


class DataBuffer {

    private _pg: Pool;
    private _tableChecked: boolean = false;

    public constructor(pgUser: string, pgPassword: string, pgDatabase: string, pgHost: string = 'localhost', pgPort: number = 5432) {
        this._pg = new Pool({
            host: pgHost,
            port: pgPort,
            user: pgUser,
            password: pgPassword,
            database: pgDatabase,
        });
    }

    public async tableCheck(): Promise<void> {
        if (this._tableChecked) { return; }
        const client = await this._pg.connect();
        try {
            await client.query('CREATE TABLE IF NOT EXISTS buffer ( id serial PRIMARY KEY, timestamp timestamp NOT NULL, data json NOT NULL, urgency smallint NOT NULL )');
        } catch (e) { console.error(e); }
        client.release();
        this._tableChecked = true;
    }

    public async push(data: Data): Promise<boolean> {
        await this.tableCheck();
        const client = await this._pg.connect();
        let insertedId: number = -1;
        try {
            let result = await client.query('INSERT INTO buffer (timestamp,data,urgency) VALUES (to_timestamp($1), $2, $3) RETURNING id', [data.timestamp, JSON.stringify(data.data), data.urgency]);
            if (result.rows.length > 0) {
                insertedId = result.rows[0].id;
            }
        } catch (e) {
            console.error(e);
        }
        client.release();
        if (insertedId < 0) {
            return false;
        }
        await sleep(1000);
        return true;
    }

    public async peek(minUrgency: DataUrgency = DataUrgency.WHENEVER, maxUrgency: DataUrgency = DataUrgency.ASAP, count: number = 100): Promise<Array<Data>> {
        await this.tableCheck();
        const client = await this._pg.connect();
        let ret: Array<Data> = [];
        let curU: DataUrgency = maxUrgency;
        while (curU >= minUrgency && ret.length < count) {
            try {
                let result = await client.query('select id, date_part(\'epoch\',timestamp) as timestamp, data, urgency from buffer where urgency = $1 order by id fetch first $2 rows only;', [curU, count-ret.length]);
                for (let i: number = 0; i < result.rows.length; i++) {
                    let tmp: {id: number, stream: string, timestamp: number, data: Object, urgency: DataUrgency} = result.rows[i];
                    let data: Data = new Data(tmp.timestamp, tmp.data, tmp.urgency, tmp.id);
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
        await this.tableCheck();
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


// EXAMPLE USAGE BELOW
//
// let login: any = JSON.parse(readFileSync('login.json', 'ascii'));
// if (login === undefined || login.id === undefined || login.password === undefined || typeof login.id !== 'number' || typeof login.password !== 'string') {
//     console.log('CRITICAL! No username/password specified');
//     console.log('\tin file: login.json');
//     console.log('\tformat: {"id":<id>,"password":"<password>"}');
// }
// else {
//     let cm: CM.ConnectionManager = new CM.ConnectionManager(['wlp3s0','wlan0'], 'LogiTrack-'+login.id, login.password, null, 5000);
//     let dr = new DataRouter(login.id, login.password, cm);
//
//     dr.connectionManager.addAP(new CM.AP(CM.APtype.WIFI, '<ssid>', '<psk>', <cost>, <speed>));
//     dr.connectionManager.addAP(new CM.AP(CM.APtype.WIFI, '<ssid>', '<psk>', <cost>, <speed>));
//     dr.connectionManager.addAP(new CM.AP(CM.APtype.HOTSPOT, '<ssid>', '<psk>', <cost>, <speed>));
//
//     setTimeout(()=>{
//         for (let i: number = 0; i < 50000; i++) {
//             dr.send(new Data(uuidv4(), Date.now(), {test: 'abc'}, DataUrgency.WHENEVER));
//         }
//     }, 5000);
// }
