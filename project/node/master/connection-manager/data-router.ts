#!/usr/bin/env ts-node

import * as CM from './connection-manager';
import {ByteBuffer, ByteBufferPool} from './byte-buffer';


export enum DataUrgency {
    WHENEVER = 0,
    LOWCOST,
    HIGHCOST,
    ASAP
}


export class Data {

    private _data: ByteBuffer;
    private _urgency: DataUrgency = DataUrgency.WHENEVER;
    // private _size: number;

    public constructor(data: ByteBuffer, urgency: DataUrgency = DataUrgency.WHENEVER) {
        this._data = data;
        this._urgency = urgency;
    }

    public get urgency(): DataUrgency {
        return this._urgency;
    }
    
}


export class DataRouter {

    private _buffer: DataBuffer = new DataBuffer();
    private _pool: ByteBufferPool = new ByteBufferPool();
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

    public get pool(): Readonly<ByteBufferPool> {
        return this._pool;
    }

    public send(data: Data) {
        this._buffer.push(data);
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
            let data: Data|null = this._buffer.peek(minU);
            if (data === null) {
                console.log('Data Router - No data to send on current connection - pausing')
                await this.sleep(1000);
                console.log('Data Router - No data to send on current connection - resuming')
                continue;
            }
            console.log('Data Router - Sending');
            //TODO: actually send data
            this._buffer.poll();
        }
    }

}


class DataBuffer {

    //TODO: implement "buffer to disk" functionality

    private _bufferWhenever: Array<Data> = [];
    private _bufferLowCost: Array<Data> = [];
    private _bufferHighCost: Array<Data> = [];
    private _bufferAsap: Array<Data> = [];

    public constructor() {

    }

    public push(data: Data): void {
        if (data.urgency === DataUrgency.WHENEVER) {
            this._bufferWhenever.push(data);
        }
        else if (data.urgency === DataUrgency.LOWCOST) {
            this._bufferWhenever.push(data);
        }
        else if (data.urgency === DataUrgency.HIGHCOST) {
            this._bufferWhenever.push(data);
        }
        else if (data.urgency === DataUrgency.ASAP) {
            this._bufferWhenever.push(data);
        }
    }

    public peek(minUrgency: DataUrgency = DataUrgency.WHENEVER): Data|null {
        if (this._bufferAsap.length > 0) {
            return this._bufferAsap[0];
        }
        else if (minUrgency <= DataUrgency.HIGHCOST && this._bufferHighCost.length > 0) {
            return this._bufferHighCost[0];
        }
        else if (minUrgency <= DataUrgency.LOWCOST && this._bufferLowCost.length > 0) {
            return this._bufferLowCost[0];
        }
        else if (minUrgency <= DataUrgency.WHENEVER && this._bufferWhenever.length > 0) {
            return this._bufferWhenever[0];
        }
        return null;
    }

    public poll(minUrgency: DataUrgency = DataUrgency.WHENEVER): Data|null {
        if (this._bufferAsap.length > 0) {
            let tmp: Data|undefined = this._bufferAsap.shift();
            if (tmp instanceof Data) return tmp;
            else return null;
        }
        else if (minUrgency <= DataUrgency.HIGHCOST && this._bufferHighCost.length > 0) {
            let tmp: Data|undefined = this._bufferHighCost.shift();
            if (tmp instanceof Data) return tmp;
            else return null;
        }
        else if (minUrgency <= DataUrgency.LOWCOST && this._bufferLowCost.length > 0) {
            let tmp: Data|undefined = this._bufferLowCost.shift();
            if (tmp instanceof Data) return tmp;
            else return null;
        }
        else if (minUrgency <= DataUrgency.WHENEVER && this._bufferWhenever.length > 0) {
            let tmp: Data|undefined = this._bufferWhenever.shift();
            if (tmp instanceof Data) return tmp;
            else return null;
        }
        return null;
    }

}

let cm: CM.ConnectionManager = new CM.ConnectionManager(5000);
let dr = new DataRouter(cm);

dr.connectionManager.addAP(new CM.AP(CM.APtype.WIFI, 'cw-2.4', '9edFrBDobS', 0, 120));
dr.connectionManager.addAP(new CM.AP(CM.APtype.WIFI, 'telenet-A837A-extended', '57735405', 0, 50));
dr.connectionManager.addAP(new CM.AP(CM.APtype.HOTSPOT, 'XT1635-02 4458', 'shagra2018', 10, 5));

setTimeout(()=>{
    dr.send(new Data(dr.pool.getBuffer()));
    dr.send(new Data(dr.pool.getBuffer()));
    dr.send(new Data(dr.pool.getBuffer()));
    dr.send(new Data(dr.pool.getBuffer()));
    dr.send(new Data(dr.pool.getBuffer()));
    dr.send(new Data(dr.pool.getBuffer()));
    dr.send(new Data(dr.pool.getBuffer()));
    dr.send(new Data(dr.pool.getBuffer()));
}, 10000);