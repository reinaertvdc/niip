import * as CM from './connection-manager';
import { Pool, PoolClient } from 'pg';
import { MQTT } from './mqtt-helper';
import { sleep } from './sleep-util';
import { NumericBase64 } from './base64-helper'
import { DataProvider } from '../data-provider/data-provider';
import { readFile } from 'fs';
import { APIServer } from "../api-server/api-server";


const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;
const PG_USER = 'logitrack';
const PG_PASSWORD = 'logitrack';
const PG_DATABASE = 'logitrack';
const PG: PgDetails = {
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
}


export enum DataUrgency {
    WHENEVER = 0,
    LOWCOST,
    // HIGHCOST,
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


interface PgDetails {
    host: string,
    port: number,
    user: string,
    password: string,
    database: string,
}


export class DataRouter {

    private _pg: Pool;

    private _buffer: DataBuffer;
    private _cm: CM.ConnectionManager;
    private _apiserver: APIServer;

    private _mqtt: MQTT;

    private _username: string;
    private _clientid: string;
    private _password: string;
    private _basetopic: string;
    private _topicup: string;
    private _topicdown: string;
    private _lastKnownMqttForwarderConnection: WebSocket|undefined = undefined;
    private _lastKnownMqttForwarderReadyState: boolean = false;

    public constructor(apiserver: APIServer, clientid: number, password: string)
    public constructor(apiserver: APIServer, clientid: number, password: string, wifiIfacePrimary: Array<string>)
    public constructor(apiserver: APIServer, clientid: number, password: string, cm: CM.ConnectionManager)
    public constructor(apiserver: APIServer, clientid: number, password: string, arg: CM.ConnectionManager|Array<string>|null = null) {
        this._pg = new Pool({
            host: PG.host,
            port: PG.port,
            user: PG.user,
            password: PG.password,
            database: PG.database,
        });
        this._apiserver = apiserver;
        this._buffer = new DataBuffer(this._pg);
        this._username = NumericBase64.encode(clientid);
        this._clientid = NumericBase64.encode(clientid);
        this._password = password;
        this._basetopic = NumericBase64.encode(clientid);
        this._topicup = 'u';
        this._topicdown = 'd';
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
        this._mqtt = new MQTT('mqtts://mqtt.logitrack.tk:443', {
            username: this._username,
            clientId: this._clientid,
            password: this._password,
            clean: false,
        });
        this._apiserver.on('mqtt-forwarder-added', (connection:WebSocket|undefined)=>{
            if (this._lastKnownMqttForwarderConnection !== undefined) {
                try {
                    this._lastKnownMqttForwarderConnection.send(JSON.stringify({
                        type: 'stop-mqtt',
                        data: {}
                    }));
                } catch (e) { console.error(e); }
            }
            this._lastKnownMqttForwarderConnection = connection;
        });
        this._apiserver.on('mqtt-forwarder-ready', ()=>{
            this._lastKnownMqttForwarderReadyState = true;
        });
        this._apiserver.on('mqtt-forwarder-stopped', ()=>{
            this._lastKnownMqttForwarderReadyState = false;
        });
        //TODO: change callback
        this._mqtt.subscribe(this._topicdown + '/' + this._basetopic, 2, (topic: string, payload:Buffer)=>{
            console.log(payload);
        }).then((val:boolean)=>{
            this.pollLoop();
            this.sendLoop();
        });
        this.initializeAPs();
    }

    private async initializeAPs(): Promise<void> {
        await this.initializeAPsFromFile('ap.json');
        let ok: boolean = false;
        while (!ok) {
            ok = await new Promise<boolean>(((resolve)=>{
                this.initializeAPsFromDatabase().then(((val: boolean)=>{
                    resolve(val);
                }).bind(this));
            }).bind(this));
            if (!ok) {
                await sleep(1000);
            }
        }
    }

    private async initializeAPsFromFile(filename: string): Promise<boolean> {
        return new Promise<boolean>(((resolve)=>{
            readFile(filename, 'ascii', ((err: NodeJS.ErrnoException, data: string)=>{
                if (err) {
                    console.error(err);
                    return resolve(false);
                }
                let o: Array<{type:'wifi'|'hotspot'|'lora',ssid:string,psk:string,cost:number,speed:number}> = [];
                try {
                    o = JSON.parse(data);
                } catch (e) {
                    console.error(e);
                    return resolve(false);
                }
                if (typeof o !== 'object' || !(o instanceof Array)) {
                    return resolve(false);
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
                return resolve(true);
            }).bind(this));
        }).bind(this));
    }

    private async initializeAPsFromDatabase(): Promise<boolean> {
        let client: PoolClient|null = null;
        try {
            client = await this._pg.connect();
            if (client === null) {
                console.log('Data Router - Could not connect to database - Could not retrieve AP\'s');
                return false;
            }
        } catch (e) {
            console.log('Data Router - Could not connect to database - Could not retrieve AP\'s');
            return false;
        }
        try {
            await client.query('CREATE TABLE IF NOT EXISTS ap ( ssid character varying(32) PRIMARY KEY, psk character(10) NOT NULL, type smallint NOT NULL, cost numeric NOT NULL, speed numeric NOT NULL )');
        } catch (e) {
            console.error(e);
            return false;
        }
        client.release();
        try {
            client = await this._pg.connect();
            if (client === null) {
                console.log('Data Router - Could not connect to database - Could not retrieve AP\'s');
                return false;
            }
        } catch (e) {
            console.log('Data Router - Could not connect to database - Could not retrieve AP\'s');
            return false;
        }
        let result = undefined;
        try {
            result = await client.query('select ssid, psk, type, cost, speed from ap');
        } catch (e) {
            console.error(e);
            return false;
        }
        client.release();
        if (result !== undefined && result.rows !== undefined) {
            for (let i: number = 0; i < result.rows.length; i++) {
                let ssid: string = result.rows[i].ssid;
                let psk: string = result.rows[i].psk;
                let type: CM.APtype = result.rows[i].type;
                let cost: number = parseInt(result.rows[i].cost, 10);
                let speed: number = parseInt(result.rows[i].speed, 10);
                let ap = new CM.AP(type, ssid, psk, cost, speed);
                this._cm.addAP(ap);
            }
        }
        return true;
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
            let minU: DataUrgency = DataUrgency.WHENEVER;
            let needsMqttForward = false;
            if (this._cm.lastConnectedAP === null || this._cm.lastConnectedNetwork === null || this._cm.lastConnectedAP.type === CM.APtype.UNDEFINED) {
                needsMqttForward = true;
                if (this._lastKnownMqttForwarderConnection === undefined) {
                    console.log('Data Router - No connection detected - pausing')
                    await sleep(1000);
                    console.log('Data Router - resuming')
                    continue;
                }
                if (!this._lastKnownMqttForwarderReadyState) {
                    this._lastKnownMqttForwarderConnection.send(JSON.stringify({
                        type: 'start-mqtt',
                        data: {}
                    }));
                    console.log('Data Router - Mqtt forwarder not ready yet - pausing')
                    await sleep(1000);
                    console.log('Data Router - resuming')
                    continue;
                }
            }
            else if (this._cm.lastConnectedAP.type === CM.APtype.WIFI) {
                minU = DataUrgency.WHENEVER;
            }
            else if (this._cm.lastConnectedAP.type === CM.APtype.HOTSPOT) {
                if (this._cm.lastConnectedAP.cost <= 5) {
                    minU = DataUrgency.LOWCOST;
                }
                else {
                    minU = DataUrgency.ASAP;
                }
            }
            let data: Array<Data> = await this._buffer.peek(minU, DataUrgency.ASAP, 10);
            if (data.length === 0) {
                console.log('Data Router - No data to send on current connection - pausing')
                await sleep(1000);
                console.log('Data Router - resuming')
                continue;
            }
            if (needsMqttForward && this._lastKnownMqttForwarderConnection !== undefined && this._lastKnownMqttForwarderReadyState) {
                console.log('Data Router - Sending using mqtt forward over mobile');
                for (let i: number = 0; i < data.length; i++) {
                    this._lastKnownMqttForwarderConnection.send(JSON.stringify({
                        type: 'mqtt-forward',
                        data: {
                            data: data[i].jsonBuffer
                        }
                    }));
                    let id: number|null = data[i].id;
                    let tmpData = new Data(data[i].timestamp, data[i].data, DataUrgency.WHENEVER);
                    await this._buffer.push(tmpData);
                    await this._buffer.remove([id]);
                }
                continue;
            }
            else {
                if (!await this._mqtt.connect()) {
                    console.log('Data Router - MQTT client no connected - pausing')
                    await sleep(1000);
                    console.log('Data Router - resuming')
                    continue;
                }
            }
            console.log('Data Router - Sending');;
            let dataArray: Array<Buffer> = [];
            for (let i: number = 0; i < data.length; i++) {
                dataArray.push(data[i].jsonBuffer);
            }
            let sendResult: Array<boolean> = await this._mqtt.publishAll(this._topicup + '/' + this._basetopic, dataArray, 2);
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

    public constructor(pg: Pool) {
        this._pg = pg;
    }

    public async tableCheck(): Promise<void> {
        if (this._tableChecked) { return; }
        let client: PoolClient|null = null;
        try {
            client = await this._pg.connect();
            if (client === null) {
                console.log('Data Router - Data Buffer - Could not connect to database');
                return;
            }
        } catch (e) {
            console.log('Data Router - Data Buffer - Could not connect to database');
            return;
        }
        try {
            await client.query('CREATE TABLE IF NOT EXISTS buffer ( id serial PRIMARY KEY, timestamp timestamp NOT NULL, data json NOT NULL, urgency smallint NOT NULL )');
        } catch (e) { console.error(e); }
        client.release();
        this._tableChecked = true;
    }

    public async push(data: Data): Promise<boolean> {
        await this.tableCheck();
        let client: PoolClient|null = null;
        try {
            client = await this._pg.connect();
            if (client === null) {
                console.log('Data Router - Data Buffer - Could not connect to database');
                return false;
            }
        } catch (e) {
            console.log('Data Router - Data Buffer - Could not connect to database');
            return false;
        }
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
        let client: PoolClient|null = null;
        try {
            client = await this._pg.connect();
            if (client === null) {
                console.log('Data Router - Data Buffer - Could not connect to database');
                return [];
            }
        } catch (e) {
            console.log('Data Router - Data Buffer - Could not connect to database');
            return [];
        }
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
            let client: PoolClient|null = null;
            try {
                client = await this._pg.connect();
                if (client === null) {
                    console.log('Data Router - Data Buffer - Could not connect to database');
                    return;
                }
            } catch (e) {
                console.log('Data Router - Data Buffer - Could not connect to database');
                return;
            }
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
