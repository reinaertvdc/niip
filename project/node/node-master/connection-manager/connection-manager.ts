#!/usr/bin/env ts-node

import {EventEmitter} from 'events';

let wifi: any = require('node-wifi');


wifi.init({iface:null});


enum APtype {
    WIFI,
    HOTSPOT,
    LORA,
    UNDEFINED
}


class AP {

    private _type: APtype = APtype.UNDEFINED;
    private _ssid: string|null = null;
    private _psk: string|null = null;
    private _cost: number = 0;
    private _speed: number = 0;

    public constructor(type: APtype, ssid: string, psk: string|null = null, cost: number = 0, speed: number = 10) {
        this._type = type;
        this._ssid = ssid;
        this._psk = psk;
        this._cost = cost;
        this._speed = speed;
    }

    public get type(): APtype {
        return this._type;
    }

    public get ssid(): string|null {
        return this._ssid;
    }

    public get psk(): string|null {
        return this._psk;
    }

    public get cost(): number {
        return this._cost;
    }

    public get speed(): number {
        return this._speed;
    }

    public set cost(cost: number) {
        this._cost = cost;
        // TODO ? notify about cost update
    }

}


export class ConnectionManager extends EventEmitter {

    private _interval: number = 15000;
    private _minQ: number = 40;
    private _aps: Array<AP> = [];

    public constructor(wifiCheckInterval: number = 15000, minQuality: number = 40) {
        super();
        this._interval = wifiCheckInterval;
        this._minQ = minQuality;
        this.connectLoop();
    }

    public addAP(ap: AP): ConnectionManager {
        this._aps.push(ap);
        return this;
    }

    public get aps(): ReadonlyArray<AP> {
        return this._aps;
    }

    private async sleep(millis: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(()=>{
                resolve();
            }, millis);
        });
    }

    private async connectLoop(): Promise<void> {
        while (true) {
            console.log('Connection Manager - Scanning');
            let tmp = await wifi.scan();
            console.log(tmp);
            
            await this.sleep(this._interval);
        }
    }

}


let cm: ConnectionManager = new ConnectionManager();

const ap0 = new AP(APtype.WIFI, 'cw-2.4', '9edFrBDobS', 0, 120);
const ap1 = new AP(APtype.WIFI, 'telenet-A837A-extended', '57735405', 0, 50);
const ap2 = new AP(APtype.HOTSPOT, 'XT1635-02 4458', 'shagra2018', 10, 5);
cm.addAP(ap0);
cm.addAP(ap1);
cm.addAP(ap2);
