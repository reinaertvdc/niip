#!/usr/bin/env ts-node

import {EventEmitter} from 'events';

import {sleep} from './sleep-util';
import {WifiManager, Network} from './wifi-manager';
export {Network} from './wifi-manager';


export enum APtype {
    UNDEFINED = 0,
    WIFI,
    HOTSPOT,
    LORA,
}


export class AP {

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

    private _wifi: WifiManager|null;
    private _htsp: WifiManager|null;
    private _htspSsid: string|null;
    private _htspPsk: string|null;
    private _htspIp: string|null;
    private _interval: number;
    private _scanWait: number;
    private _minQ: number = 40;
    private _aps: Array<AP> = [];
    private _ap: AP|null = null;
    private _net: Network|null = null;

    public constructor(wifiIfacePrimary: Array<string>|null = null, hotspotSsid: string|null = null, hotspotPsk: string|null = null, hotspotIp: string|null = null, wifiCheckInterval: number = 10000, scanWaitTime: number = 5000, minQuality: number = 25) {
        super();
        this._interval = wifiCheckInterval;
        this._scanWait = scanWaitTime;
        this._minQ = minQuality;
        this._wifi = new WifiManager(wifiIfacePrimary, null, ['8.8.8.8', '8.8.4.4', '1.1.1.1'], ['2001:4860:4860::8888', '2001:4860:4860::8844']);
        this._htsp = new WifiManager(null, wifiIfacePrimary, ['8.8.8.8', '8.8.4.4', '1.1.1.1'], ['2001:4860:4860::8888', '2001:4860:4860::8844']);
        this._htspSsid = hotspotSsid;
        this._htspPsk = hotspotPsk;
        this._htspIp = hotspotIp;
        this.connectLoop();
    }

    public addAP(ap: AP): ConnectionManager {
        for (let i: number = 0; i < this._aps.length; i++) {
            let tmp = this._aps[i];
            if (tmp.ssid === ap.ssid) {
                this._aps[i] = ap;
                if (this._ap.ssid === ap.ssid) {
                    this._ap = ap;
                }
                return this;
            }
        }
        this._aps.push(ap);
        return this;
    }

    public removeAP(ssid: string): Array<AP> {
        let removed: Array<AP> = [];
        for (let i: number = this._aps.length -1; i >= 0; i--) {
            let ap = this._aps[i];
            if (ap.ssid === ssid) {
                this._aps.splice(i, 1);
                removed.push(ap);
                if (this._ap.ssid === ssid) {
                    this._ap = null;
                }
            }
        }
        return removed;
    }

    public get aps(): ReadonlyArray<AP> {
        return this._aps;
    }

    private parseScanResults(scanResults: Array<Network>): {wifi: {ap: AP|null, net: Network|null}, hotspot: {ap: AP|null, net: Network|null}, lora: {ap: AP|null, net: Network|null}} {

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

        return {wifi: bestWifi, hotspot: bestHotspot, lora: bestLora};

    }

    private async connectLoop(): Promise<void> {
        let firstrun: boolean = true;
        while (true) {
            if (firstrun) {
                firstrun = false;
            }
            else {
                await sleep(this._interval);
            }
            if (this._htsp !== null) {
                let tmp = await this._htsp.init();
                if (tmp) {
                    if (!this._htsp.hasHotspot) {
                        this._htsp.hotspot(this._htspSsid, this._htspPsk, this._htspIp);
                    }
                }
                else {
                    console.log('Connection Manager - WARNING - Could not initialize interface (hotspot)');
                }
            }
            if (this._wifi !== null) {
                if (!await this._wifi.init()) {
                    console.log('Connection Manager - WARNING - Could not initialize interface');
                    continue;
                }

                console.log('Connection Manager - Scanning');
                let bestNets = this.parseScanResults(await this._wifi.scan(true, this._scanWait));

                if ((bestNets.wifi.ap === null || bestNets.wifi.net === null) && (bestNets.hotspot.ap === null || bestNets.hotspot.net === null)) {
                    console.log('Connection Manager - Requesting mobile hotspot');
                    console.log('Connection Manager - WARNING - not implemented yet');
                    //TODO: request hotspot (and wait)
                    bestNets = this.parseScanResults(await this._wifi.scan(true, this._scanWait));
                    if (bestNets.hotspot.ap === null || bestNets.hotspot.net === null) {
                        console.log('Connection Manager - Could not request mobile hostpot');
                    }
                    else {
                        console.log('Connection Manager - Mobile hotspot request succesful');
                    }
                }

                if (bestNets.wifi.ap !== null && bestNets.wifi.net !== null) {
                    console.log('Connection Manager - Best wifi: ' + bestNets.wifi.ap.ssid);
                }
                else {
                    console.log('Connection Manager - Best wifi: /');
                }
                if (bestNets.hotspot.ap !== null && bestNets.hotspot.net !== null) {
                    console.log('Connection Manager - Best htsp: ' + bestNets.hotspot.ap.ssid);
                }
                else {
                    console.log('Connection Manager - Best htsp: /');
                }
                if (bestNets.lora.ap !== null && bestNets.lora.net !== null) {
                    console.log('Connection Manager - Best lora: ' + bestNets.lora.ap.ssid);
                }
                else {
                    console.log('Connection Manager - Best lora: /');
                }
                
                let best: {ap: AP|null, net: Network|null} = {ap: null, net: null};
                if (bestNets.wifi.ap !== null && bestNets.wifi.net !== null) {
                    best = bestNets.wifi;
                }
                else if (bestNets.hotspot.ap !== null && bestNets.hotspot.net !== null) {
                    best = bestNets.hotspot;
                }
                else if (bestNets.lora.ap !== null && bestNets.lora.net !== null) {
                    best = bestNets.lora;
                }

                if (best.net === null || best.ap === null) {
                    console.log('Connection Manager - No known networks found');
                    this.onConnect(null, null, false);
                    continue;
                }

                console.log('Connection Manager - Getting current connections');
                let conns: Array<Network> = await this._wifi.connections();

                if (conns.length === 0) {
                    console.log('Connection Manager - Connecting to ' + best.ap.ssid);
                    this.onConnect(null, null, false);
                    if (best.ap.ssid === null || best.ap.psk === null || !(await this._wifi.connect(best.ap.ssid, best.ap.psk))) {
                        console.log('Connection Manager - Could not connect to ' + best.ap.ssid);
                        continue;
                    }
                    console.log('Connection Manager - Connected to ' + best.ap.ssid);
                    this.onConnect(best.ap, best.net, true);
                    continue;
                }

                if (conns.length > 1) {
                    console.log('Connection Manager - WARNING - More than 1 current connection on interface!');
                }

                let conn: {ap: AP|null, net:Network} = {ap: null, net: conns[0]};
                if (conn.net.ssid === best.ap.ssid && (conn.net.bssid === best.net.bssid || conn.net.quality+5 >= best.net.quality)) {
                    console.log('Connection Manager - Connected to best network already');
                    this.onConnect(best.ap, best.net, false);
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
                    this.onConnect(null, null, false);
                    if (best.ap.ssid === null || best.ap.psk === null || !(await this._wifi.connect(best.ap.ssid, best.ap.psk))) {
                        console.log('Connection Manager - Could not connect to ' + best.ap.ssid);
                        continue;
                    }
                    console.log('Connection Manager - Connected to ' + best.ap.ssid);
                    this.onConnect(best.ap, best.net, true);
                }
                else {
                    console.log('Connection Manager - Not reconnecting');
                    this.onConnect(conn.ap, conn.net, false);
                }
            }
            else {
                console.log('Connection Manager - WARNING - No wifi interface specified');
                this.onConnect(null, null, false);
            }

        }
    }

    private onConnect(ap: AP|null, net: Network|null, newConnection: boolean): void {
        this._ap = ap;
        this._net = net;
        this.emit('connect', ap, net, newConnection);
    }

    public get lastConnectedAP(): AP|null {
        return this._ap;
    }

    public get lastConnectedNetwork(): Network|null {
        return this._net;
    }

}


// EXAMPLE USAGE

// let cm: ConnectionManager = new ConnectionManager(5000);
// cm.on('connect', (ap:AP|null,net:Network|null,newConnection:boolean) => {
//     if (ap !== null && net !== null) {
//         console.log('CONNECT TRIGGERED ' + ap.ssid);
//         if (newConnection) {
//             console.log('\treconnect')
//         }
//     }
// });
// cm.addAP(new AP(APtype.WIFI, '<ssid_1>', '<wpa_psk_1>', 0, 120));
// cm.addAP(new AP(APtype.WIFI, '<ssid_2>', '<wpa_psk_2>', 0, 50));
// cm.addAP(new AP(APtype.HOTSPOT, '<ssid_3>', '<wpa_psk_3>', 10, 5));
