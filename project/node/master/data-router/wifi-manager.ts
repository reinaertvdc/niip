#!/usr/bin/env ts-node

import {exec as execCB} from 'child_process';
import {sleep} from './sleep-util';


function exec(cmd: string): Promise<{out:string,err:string}> {
    return new Promise((resolve, reject) => {
        execCB(cmd, (error, stdout, sdterr) => {
            let out: string|null = null;
            resolve({out: stdout, err: sdterr});
        });
    });
}


export interface Network {
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


export class WifiManager {

    private _iface: string|null = null;
    private _ifaceWhitelist: Array<string> = [];
    private _ifaceUseWhitelist: boolean = false;
    private _ifaceUseBlacklist: boolean = false;
    private _ifaceBlacklist: Array<string> = []
    private _dns: Array<string> = [];
    private _dns6: Array<string> = [];
    private _hasHotspot: boolean = false;
    // private _ifaceIndex: number = -1;
    private _initialized: boolean = false;
    private _dnsSet = false;

    public get initialized(): boolean {
        return this._initialized;
    }

    public get iface(): string|null {
        return this._iface;
    }

    public constructor(ifaceWhitelist: Array<string>|null = null, ifaceBlacklist: Array<string>|null = null, dns: Array<string> = [], dns6: Array<string> = []) {
        if (ifaceWhitelist !== null) {
            this._ifaceUseWhitelist = true;
            this._ifaceWhitelist = ifaceWhitelist;
        }
        if (ifaceBlacklist !== null) {
            this._ifaceUseBlacklist = true;
            this._ifaceBlacklist = ifaceBlacklist;
        }
        this._dns = dns;
        this._dns6 = dns6;
    }

    private async runNmcliCmd(fields: Array<string>, cmd: string, ifname: boolean, wait: number|null = null): Promise<{out:string, err:string, parsed:Array<Array<string>>, cmd:string}> {
        let cmdStr: string = 'nmcli '
        if (fields.length > 0) {
            cmdStr += '-t -f ' + fields[0];
            for (let i: number = 1; i < fields.length; i++) {
                cmdStr += ',' + fields[i];
            }
            cmdStr += ' ';
        }
        if (wait !== null) {
            cmdStr += '-w ' + wait + ' ';
        }
        cmdStr += cmd;
        if (ifname && this._iface !== null) {
            cmdStr += ' ifname ' + this._iface;
        }
        let {out,err} = (await exec(cmdStr));
        let lines: Array<string> = out.split('\n');
        let ret: Array<Array<string>> = [];
        for (let i: number = 0; i < lines.length; i++) {
            let line: string = lines[i].trim();
            if (fields.length === 0) {
                ret.push([line]);
                continue;
            }
            let parts: Array<string> = line.replace(/\\\:/g, '&&').split(':');
            if (parts.length !== fields.length) continue;
            for (let j: number = 0; j < parts.length; j++) {
                parts[j] = parts[j].replace(/\&\&/g, ':').trim();
            }
            ret.push(parts);
        }
        return {out:out,err:err,parsed:ret,cmd:cmdStr};
    }

    public async interfaces(): Promise<Array<string>> {
        let ifaces: Array<string> = [];
        let out: Array<Array<string>> = (await this.runNmcliCmd(['device','type'], 'd', false)).parsed;
        for (let i: number = 0; i < out.length; i++) {
            if (out[i][1] === 'wifi') {
                ifaces.push(out[i][0]);
            }
        }
        return ifaces;
    }

    private async initIface(): Promise<boolean> {
        let ifaces: Array<string> = await this.interfaces();
        for (let i: number = 0; i < ifaces.length; i++) {
            let whitelisted: boolean = true;
            let blacklisted: boolean = false;
            if (this._ifaceUseWhitelist) {
                whitelisted = this._ifaceWhitelist.includes(ifaces[i]);
            }
            if (this._ifaceUseBlacklist) {
                blacklisted = this._ifaceBlacklist.includes(ifaces[i]);
            }
            if (whitelisted && !blacklisted) {
                this._iface = ifaces[i];
                return true;
            }
        }
        return false;
    }

    public async setConnectionDns(conn: string): Promise<void> {
        // console.log('SETTING DNS');
        // console.log(this._dns);
        // console.log(this._dns6);
        if (this._dns.length > 0) {
            let servers: string = this._dns[0];
            for (let i: number = 1; i < this._dns.length; i++) {
                servers += ' ' + this._dns[i];
            }
            await this.runNmcliCmd([], 'con modify "' + conn + '" ipv4.dns "' + servers + '"', false);
            await this.runNmcliCmd([], 'con modify "' + conn + '" ipv4.ignore-auto-dns yes', false);
        }
        if (this._dns6.length > 0) {
            let servers: string = this._dns6[0];
            for (let i: number = 1; i < this._dns6.length; i++) {
                servers += ' ' + this._dns6[i];
            }
            await this.runNmcliCmd([], 'con modify "' + conn + '" ipv6.dns "' + servers + '"', false);
            await this.runNmcliCmd([], 'con modify "' + conn + '" ipv6.ignore-auto-dns yes', false);
        }
        await this.runNmcliCmd([], 'con down "' + conn + '"', false);
        await this.runNmcliCmd([], 'con up "' + conn + '"', true);
    }

    private async checkHotspot(): Promise<boolean> {
        let tmp = (await this.runNmcliCmd(['active','device','name'],'con show', false)).parsed;
        for (let i: number = 0; i < tmp.length; i++) {
            if (tmp[i][0] === 'yes' || tmp[i][0] === 'ja') {
                if (tmp[i][1] === this._iface) {
                    if (tmp[i][2] === 'Hotspot') {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public async init(): Promise<boolean> {
        if (this._initialized) {
            let ifaces: Array<string> = await this.interfaces();
            if (this._iface !== null && ifaces.includes(this._iface)) {
                if (this._hasHotspot) {
                    if (!await this.checkHotspot()) {
                        this._hasHotspot = false;
                    }
                }
                return true;
            }
            else {
                this._initialized = false;
                this._iface = null;
                this._hasHotspot = false;
            }
        }
        if (!this._initialized) {
            this._initialized = await this.initIface();
        }
        if (!this._initialized) {
            this._iface = null;
            this._hasHotspot = false;
        }
        return this._initialized;
    }

    public async rescan(): Promise<void> {
        if (!(await this.init())) { return; }
        await this.runNmcliCmd([], 'dev wifi rescan', true);
    }

    public async scan(forceRescan: boolean = false, rescanWaitTime: number = 5000): Promise<Array<Network>> {
        if (!(await this.init())) { return []; }
        if (forceRescan) {
            this.rescan();
            if (rescanWaitTime > 0) {
                await sleep(rescanWaitTime);
            }
        }
        let out: Array<Array<string>> = (await this.runNmcliCmd(['active','ssid','bssid','mode','chan','freq','signal','security','wpa-flags','rsn-flags'], 'dev wifi list', true)).parsed;
        let nets: Array<Network> = [];
        for (let i: number = 0; i < out.length; i++) {
            let net: Network = {
                ssid: out[i][1],
                bssid: out[i][2],
                mac: out[i][2],
                mode: out[i][3],
                channel: parseInt(out[i][4]),
                frequency: parseInt(out[i][5]),
                signal_level: (parseFloat(out[i][6],)/2 - 100),
                quality: parseFloat(out[i][6]),
                security: out[i][7] !== '(none)' ? out[i][7] : 'none',
                security_flags: {
                    wpa: out[i][8],
                    rsn: out[i][9],
                },
            }
            nets.push(net);
        }
        return nets;
    }

    public async connections(): Promise<Array<Network>> {
        if (!(await this.init())) { return []; }
        let tmp = await this.runNmcliCmd(['active','ssid','bssid','mode','chan','freq','signal','security','wpa-flags','rsn-flags'], 'dev wifi list', true);
        let out: Array<Array<string>> = tmp.parsed;
        let nets: Array<Network> = [];
        for (let i: number = 0; i < out.length; i++) {
            if (out[i][0] !== 'yes' && out[i][0] !== 'ja') { continue; }
            let net: Network = {
                ssid: out[i][1],
                bssid: out[i][2],
                mac: out[i][2],
                mode: out[i][3],
                channel: parseInt(out[i][4]),
                frequency: parseInt(out[i][5]),
                signal_level: (parseFloat(out[i][6],)/2 - 100),
                quality: parseFloat(out[i][6]),
                security: (out[i][7] !== '(none)' && out[i][7] !== '(geen)') ? out[i][7] : 'none',
                security_flags: {
                    wpa: out[i][8],
                    rsn: out[i][9],
                },
            }
            nets.push(net);
        }
        if (!this._dnsSet) {
            for (let i: number = 0; i < nets.length; i++) {
                await this.setConnectionDns(nets[i].ssid);
            }
            this._dnsSet = true;
        }
        return nets;
    }

    private async delete(ssid: string): Promise<void> {
        if (!(await this.init())) { return; }
        await this.runNmcliCmd([], 'conn delete id \'' + ssid + '\'', false);
    }

    public async connect(ssid: string, psk: string): Promise<boolean> {
        if (!(await this.init())) { return false; }
        await this.delete(ssid);
        let err: string =  (await this.runNmcliCmd([], 'dev wifi connect \'' + ssid + '\' password \'' + psk + '\'', true, 10)).err;
        if (err.includes('Error')) {
            return false;
        }
        this.setConnectionDns(ssid);
        return true;
    }

    public async disconnect(): Promise<void> {
        if (!(await this.init())) { return; }
        this._hasHotspot = false;
        await this.runNmcliCmd([], 'dev disconnect', true);
    }

    public async hotspot(ssid: string|null = 'Hotspot', psk: string|null = 'password', ip: string|null = null): Promise<boolean> {
        if (!(await this.init())) { return false; }
        this._hasHotspot = false;
        await this.delete('Hotspot');
        let tmp = await this.runNmcliCmd([], 'con add type wifi con-name Hotspot autoconnect no ssid ' + ssid, true);
        tmp = await this.runNmcliCmd([], 'con mod Hotspot 802-11-wireless.mode ap 802-11-wireless.band bg 802-11-wireless.channel 1 ipv4.method shared ipv6.method ignore', false);
        tmp = await this.runNmcliCmd([], 'con mod Hotspot 802-11-wireless-security.key-mgmt wpa-psk 802-11-wireless-security.psk ' + psk, false);
        if (ip !== null) {
            tmp = await this.runNmcliCmd([], 'con modify Hotspot ipv4.addresses ' + ip + '/24', false);
        }
        tmp = await this.runNmcliCmd([], 'con up Hotspot', false);
        let out: string = tmp.out;
        if (out.includes('success')) {
            this._hasHotspot = true;
            return true;
        }
        else {
            await this.delete('Hotspot');
            this._hasHotspot = false;
            return false;
        }
    }

    public get hasHotspot(): boolean {
        return this._hasHotspot;
    }

}


// EXAMPLE CODE BELOW
// async function test() {
//     let wifi: WifiManager = new WifiManager();
//     let ok: boolean = await wifi.init();
//     console.log(wifi.iface);
//     console.log(await wifi.hotspot());
//     console.log(await wifi.scan(true));
//     console.log(await wifi.disconnect());
//     console.log(await wifi.scan(true));
//     console.log(await wifi.connections());    
//     console.log(await wifi.hotspot());
// }
// test();
