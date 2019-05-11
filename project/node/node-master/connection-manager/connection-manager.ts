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


interface Network {
    ssid: string;
    bssid: string;
    mac:string;
    mode:string;
    channel: number;
    frequency: number;
    signal_level: number;
    quality: number;
    security: string;
    security_flags: {wpa: string, rsn: string}
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
        let firstrun: boolean = true;
        while (true) {
            if (firstrun) {
                firstrun = false;
            }
            else {
                await this.sleep(this._interval);
            }
            console.log('Connection Manager - Scanning');
            let scanResults: Array<Network>;
            try {
                scanResults = await wifi.scan();
            } catch (e) {
                console.log('Connection Manager - Error trying to scan');
                console.log('==================================================');
                console.log(e);
                console.log('==================================================');
                this.emit('connect', null, null, false);
                continue;
            }

            //TODO: remove log
            // console.log(scanResults);

            let bestWifi: {ap: AP|null, net: Network|null} = {ap: null, net: null}
            let bestHotspot: {ap: AP|null, net: Network|null} = {ap: null, net: null}
            let bestLora: {ap: AP|null, net: Network|null} = {ap: null, net: null}

            scanResults.forEach((net: Network) => {
                for (let j = 0; j < this._aps.length; j++) {
                    let ap = this._aps[j];
                    if (net.ssid === ap.ssid) {
                        let cmpWith: {ap: AP|null, net: Network|null} = {ap: null, net: null}
                        if (ap.type === APtype.WIFI) {
                            cmpWith = bestWifi;
                        }
                        else if (ap.type === APtype.HOTSPOT) {
                            cmpWith = bestHotspot;
                        }
                        else if (ap.type === APtype.LORA) {
                            cmpWith = bestLora;
                        }
                        else {
                            break;
                        }
                        let isBetter = false;
                        let qd = (net === null || cmpWith.net === null ? 0 : net.quality - cmpWith.net.quality);
                        let sf = (ap === null || cmpWith.ap === null ? 1 : ap.speed / cmpWith.ap.speed);
                        if (cmpWith.ap === null || cmpWith.net === null) isBetter = true;
                        else if (qd > 0) {
                            if (cmpWith.net.quality < this._minQ) {
                                isBetter = true;
                            }
                            else if (sf >= 1) {
                                isBetter = true;
                            }
                            else if (qd / 10 < 2 * sf) {
                                isBetter = true;
                            }
                        }
                        else if (sf > 1) {
                            if (qd >= this._minQ && -qd / 10 < 2 * sf) {
                                isBetter = true;
                            }
                        }
                        if (isBetter) {
                            if (ap.type === APtype.WIFI) {
                                bestWifi.ap = ap;
                                bestWifi.net = net;
                            }
                            else if (ap.type === APtype.HOTSPOT) {
                                bestHotspot.ap = ap;
                                bestHotspot.net = net;
                            }
                            else if (ap.type === APtype.LORA) {
                                bestLora.ap = ap;
                                bestLora.net = net;
                            }
                        }
                        break;
                    }
                }    
            }, this);

            if (bestWifi.ap !== null && bestWifi.net !== null) {
                console.log('Connection Manager - Best wifi: ' + bestWifi.ap.ssid);
            }
            else {
                console.log('Connection Manager - Best wifi: /');
            }
            if (bestHotspot.ap !== null && bestHotspot.net !== null) {
                console.log('Connection Manager - Best htsp: ' + bestHotspot.ap.ssid);
            }
            else {
                console.log('Connection Manager - Best htsp: /');
            }
            if (bestLora.ap !== null && bestLora.net !== null) {
                console.log('Connection Manager - Best lora: ' + bestLora.ap.ssid);
            }
            else {
                console.log('Connection Manager - Best lora: /');
            }
            
            let best: {ap: AP|null, net: Network|null} = {ap: null, net: null};
            let bestType: APtype = APtype.UNDEFINED;
            if (bestWifi.ap !== null && bestWifi.net !== null) {
                best = bestWifi;
                bestType = APtype.WIFI;
            }
            else if (bestHotspot.ap !== null && bestHotspot.net !== null) {
                best = bestHotspot;
                bestType = APtype.HOTSPOT;
            }
            else if (bestLora.ap !== null && bestLora.net !== null) {
                best = bestLora;
                bestType = APtype.LORA;
            }

            if (best.net === null || best.ap === null) {
                continue;
            }

            console.log('Connection Manager - Getting current connections');
            let conns: Array<Network> = [];

            try {
                conns = await wifi.getCurrentConnections();
            } catch (e) {
                console.log('Connection Manager - Error getting current connections');
                console.log('==================================================');
                console.log(e);
                console.log('==================================================');
                this.emit('connect', null, null, false);
                continue;
            }

            //TODO: remove log
            // console.log(conns);

            if (conns.length === 0) {
                console.log('Connection Manager - Connecting to ' + best.ap.ssid);
                try {
                    await wifi.connect({ssid:best.ap.ssid, password:best.ap.psk});
                } catch (e) {
                    console.log('Connection Manager - Error while trying to connect to network');
                    console.log('==================================================');
                    console.log(e);
                    console.log('==================================================');
                    this.emit('connect', null, null, false);
                    continue;
                }
                console.log('Connection Manager - Connected to ' + best.ap.ssid);
                this.emit('connect', best.ap, best.net, true);
                continue;
            }

            if (conns.length > 1) {
                console.log('Connection Manager - WARNING - More than 1 connection!');
            }

            let conn: {ap: AP|null, net:Network} = {ap: null, net: conns[0]};
            if (conn.net.ssid === best.ap.ssid && (conn.net.bssid === best.net.bssid || conn.net.quality+5 >= best.net.quality)) {
                console.log('Connection Manager - Connected to best network already');
                this.emit('connect', best.ap, best.net, false);
                continue;
            }
            for (let i = 0; i < this._aps.length; i++) {
                if (conn.net.ssid === this._aps[i].ssid) {
                    conn.ap = this._aps[i];
                    break;
                }
            }
            let isBetter = false;
            if (conn.ap === null) {
                isBetter = true;
            }
            else if (best.ap.type === APtype.WIFI && conn.ap.type !== APtype.WIFI) {
                isBetter = true;
            }
            else if (best.ap.type === APtype.HOTSPOT && conn.ap.type !== APtype.WIFI && conn.ap.type !== APtype.HOTSPOT) {
                isBetter = true;
            }
            else if (best.ap.type === conn.ap.type) {
                if (best.ap.cost === 0 && conn.ap.cost > 0) {
                    isBetter = true;
                }
                else { //TODO: add if clause to check if cost is not going up too much
                    let qd = best.net.quality - conn.net.quality;
                    let sf = best.ap.speed / conn.ap.speed;
                    if (qd > 0) {
                        if (conn.net.quality < this._minQ) {
                            isBetter = true;
                        }
                        else if (sf >= 1) {
                            isBetter = true;
                        }
                        else if (qd / 10 < 2 * sf) {
                            isBetter = true;
                        }
                    }
                    else if (sf > 1) {
                        if (qd >= this._minQ && -qd / 10 < 2 * sf) {
                            isBetter = true;
                        }
                    }
                }

            }

            if (isBetter) {
                console.log('Connection Manager - Connecting to ' + best.ap.ssid);
                try {
                    await wifi.connect({ssid:best.ap.ssid, password:best.ap.psk});
                } catch (e) {
                    console.log('Connection Manager - Error while trying to connect to network');
                    console.log('==================================================');
                    console.log(e);
                    console.log('==================================================');
                    continue;
                }
                console.log('Connection Manager - Connected to ' + best.ap.ssid);
                this.emit('connect', best.ap, best.net, true);
            }
            else {
                console.log('Connection Manager - Not reconnecting');
                this.emit('connect', conn.ap, conn.net, false);
            }
        }
    }

}


let cm: ConnectionManager = new ConnectionManager(5000);
cm.on('connect', (ap:AP|null,net:Network|null,newConnection:boolean) => {
    if (ap !== null && net !== null) {
        console.log('CONNECT TRIGGERED ' + ap.ssid);
        if (newConnection) {
            console.log('\treconnect')
        }
    }
});

const ap0 = new AP(APtype.WIFI, 'cw-2.4', '9edFrBDobS', 0, 120);
const ap1 = new AP(APtype.WIFI, 'telenet-A837A-extended', '57735405', 0, 50);
const ap2 = new AP(APtype.HOTSPOT, 'XT1635-02 4458', 'shagra2018', 10, 5);
cm.addAP(ap0);
cm.addAP(ap1);
cm.addAP(ap2);