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
    private _ifaceIndex: number = -1;
    private _initialized: boolean = false;

    public get initialized(): boolean {
        return this._initialized;
    }

    public get iface(): string|null {
        return this._iface;
    }

    public constructor(iface: string|number|null = null) {
        if (typeof iface === 'string') {
            this._iface = iface;
        }
        else if (typeof iface === 'number') {
            this._ifaceIndex = iface;
        }
        else {
            this._ifaceIndex = 0;
        }
    }

    private async runNmcliCmd(fields: Array<string>, cmd: string, ifname: boolean, wait: number|null = null): Promise<{out:string, err:string, parsed:Array<Array<string>>}> {
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
        return {out:out,err:err,parsed:ret};
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

    private async initIfaceNameIndex(): Promise<boolean> {
        let ifaces: Array<string> = await this.interfaces();
        if (this._iface === null && this._ifaceIndex < 0) {
            return false;
        }
        else if (this._iface === null && this._ifaceIndex >= 0) {
            if (this._ifaceIndex >= ifaces.length) {
                return false;
            }
            this._iface = ifaces[this._ifaceIndex];
        }
        else if (this._iface !== null && this._ifaceIndex < 0) {
            let tmpIndex: number = ifaces.indexOf(this._iface);
            if (tmpIndex < 0) {
                return false;
            }
            this._ifaceIndex = tmpIndex;
        }
        else if (this._iface !== null && this._ifaceIndex >= 0) {
            if (this._ifaceIndex >= ifaces.length) {
                return false;
            }
            if (ifaces[this._ifaceIndex] !== this._iface) {
                return false;
            }
        }
        return true;
    }

    public async init(): Promise<boolean> {
        if (this._initialized) {
            return true;
        }
        if (!(await this.initIfaceNameIndex())) {
            return false;
        }
        return true;
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
        let out: Array<Array<string>> = (await this.runNmcliCmd(['active','ssid','bssid','mode','chan','freq','signal','security','wpa-flags','rsn-flags'], 'dev wifi list', true)).parsed;
        let nets: Array<Network> = [];
        for (let i: number = 0; i < out.length; i++) {
            if (out[i][0] !== 'yes') { continue; }
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
        return true;
    }

    public async disconnect(): Promise<void> {
        if (!(await this.init())) { return; }
        await this.runNmcliCmd([], 'dev disconnect', true);
    }

}


// EXAMPLE CODE BELOW
// async function test() {
//     let wifi: WifiManager = new WifiManager();
//     let ok: boolean = await wifi.init();
//     console.log(wifi.iface);
//     console.log(await wifi.scan(true));
//     console.log(await wifi.connections());    
// }
// test();
