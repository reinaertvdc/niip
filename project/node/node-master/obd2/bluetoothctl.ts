import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";

const stripAnsi = require("strip-ansi");

// Regexes for parsing the output of bluetoothctl
// Prompt
const PROMPT_RE: RegExp = /\[(.+?)\]# $/;

// Paired Devices RE
const DEVICE_RE: RegExp = /(?:^Device )((?:[A-F0-9]{2})(?:\:[A-F0-9]{2})+) (.+)/;

// Scanning RE
const NEW_RE: RegExp = /(?:\[NEW\] )(?:Device )((?:[A-F0-9]{2})(?:\:[A-F0-9]{2})+) (.+)/;
const CHANGE_RE: RegExp = /(?:\[CHG] Device )((?:[A-F0-9]{2})(?:\:[A-F0-9]{2})+) (.+)\: (.+)/;
const DELETE_RE: RegExp = /(?:\[DEL\] )(?:Device )((?:[A-F0-9]{2})(?:\:[A-F0-9]{2})+) (.+)/;

// Pairing RE
const PAIR_ATTEMPT_RE: RegExp = /(?:Attempting to pair with) ((?:[A-F0-9]{2})(?:\:[A-F0-9]{2})+)/;
const PAIR_CONFIRMATION_RE: RegExp = /(?:Request confirmation)/;
const PAIR_PASSKEY_RE: RegExp = /(?:\[agent\] Confirm passkey) ([0-9]+)/;
const PAIR_SUCCESS_RE: RegExp = /(?:Pairing successful)/;
const PAIR_FAIL_RE: RegExp = /(?:Failed to pair\: )(.+)/;

// Connect RE
const CONNECT_ATTEMPT_RE: RegExp = /(?:Attempting to connect to )((?:[A-F0-9]{2})(?:\:[A-F0-9]{2})+)/;
const CONNECT_SUCCESS_RE: RegExp = /(?:Connection successful)/;
const CONNECT_FAIL_RE: RegExp = /(?:Failed to connect: )(.+)/;

// Regexes for parsing the input of bluetoothctl
const PAIRED_DEVICES_RE: RegExp = /(?:(?:\[.+?\]# )?paired-devices)/
const DEVICES_RE: RegExp = /(?:(?:\[.+?\]# )?devices)/;
const SCAN_RE: RegExp = /(?:(?:\[.+?\]# )?scan (?:on|off))/;
const PAI_RE: RegExp = /(?:(?:\[.+?\]# )?pair )(.+)/;


// Categorizing lines we can parse
enum LineType {
    Prompt,             // ^[(bluetooth | <devicename>)]# $,
    ScanIn,             // ^scan (on|off)$
    New,                // ^[NEW] Device <mac address> <name>$
    Change,             // ^[CHG] Device <mac address> <key>: <value>
    Delete,             // ^[DEL] Device <mac address> <key>: <value>
    PairedDevicesIn,    // ^paired-devices$
    DevicesIn,          // ^devices$
    Device,             // ^Device <mac address> <name>$
    PairIn,             // ^pair <mac address>
    PairAttempt,        // ^Attempting to pair with <mac>$
    PairConfirmation,   // ^Request confirmation$
    PairPasskey,        // ^Confirm passkey <number> (yes/no):$
    PairSuccess,        // ^Pairing successful$
    PairFail,           // ^Failed to pair: <error>$
    Irrelevant          // anything not matching the above
}

type BTInfo = {
    mac: string;
    name: string;
}

type REEntry = {
    type: LineType;
    re: RegExp;
    parse: (matches: RegExpExecArray) => Object;
}

type REResult = {
    type: LineType;
    matches: RegExpExecArray;
    parsed: any;
}

// Array so we can later easily loop over the array to determine the type of a line
const RE_ARRAY: REEntry[] = [{
    type: LineType.Prompt,
    re: PROMPT_RE,
    parse: (matches: RegExpExecArray) => {
        return {};
    }
}, {
    type: LineType.ScanIn,
    re: SCAN_RE,
    parse: (matches: RegExpExecArray) => {
        return {};
    }
}, {
    type: LineType.New,
    re: NEW_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            mac: matches[1],
            name: matches[2],
        };
    }
}, {
    type: LineType.Change,
    re: CHANGE_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            mac: matches[1],
            key: matches[2],
            value: matches[3],
        };
    }
}, {
    type: LineType.Delete,
    re: DELETE_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            mac: matches[1],
            name: matches[2],
        };
    }
}, {
    type: LineType.PairedDevicesIn,
    re: PAIRED_DEVICES_RE,
    parse: (matches: RegExpExecArray) => {
        return {};
    }
}, {
    type: LineType.DevicesIn,
    re: DEVICES_RE,
    parse: (matches: RegExpExecArray) => {
        return {};
    }
}, {
    type: LineType.Device,
    re: DEVICE_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            mac: matches[1],
            name: matches[2],
        };
    }
}, {
    type: LineType.PairIn,
    re: PAI_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            mac: matches[1]
        };
    }
}, {
    type: LineType.PairAttempt,
    re: PAIR_ATTEMPT_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            mac: matches[1]
        }
    }
}, {
    type: LineType.PairConfirmation,
    re: PAIR_CONFIRMATION_RE,
    parse: (matches: RegExpExecArray) => {
        return {}
    }
}, {
    type: LineType.PairPasskey,
    re: PAIR_PASSKEY_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            passkey: matches[1]
        }
    }
}, {
    type: LineType.PairSuccess,
    re: PAIR_SUCCESS_RE,
    parse: (matches: RegExpExecArray) => {
        return {}
    }
}, {
    type: LineType.PairFail,
    re: PAIR_FAIL_RE,
    parse: (matches: RegExpExecArray) => {
        return {
            error: matches[1]
        }
    }
}]

class BluetoothCTL extends EventEmitter {
    private cli: ChildProcessWithoutNullStreams = null;
    private devices: Map<string, any> = null;
    private connected: Set<string> = null;

    private scanning: boolean = false;

    constructor() {
        super();
        this.cli = spawn("bluetoothctl");
        this.devices = new Map<string, any>();
        this.connected = new Set<string>();

        this.attachListeners();
    }

    public clear() {
        this.cli.stdin.write("exit\n");
        this.cli = spawn("bluetoothctl");
    }

    public clearListeners() {
        this.cli.removeAllListeners();
    }

    public getMAC(deviceName: string, includeKnown: boolean = true, includePaired: boolean = true): Promise<Set<string>> {
        return new Promise<Set<string>>(async (resolve, reject) => {
            let answers: Set<string> = new Set<string>();

            let candidates: BTInfo[] = [];
            let pairedDevices: BTInfo[] = [];
            
            if(includeKnown)
                candidates = await this.getKnownDevicesByName(deviceName);
            if(includePaired) 
                pairedDevices = await this.getPairedDevicesByName(deviceName);

            let combined = [...candidates, ...pairedDevices];
            
            if(combined.length > 0) {
                combined.forEach((value: BTInfo) => {
                    answers.add(value.mac);
                });
            }

            this.devices.forEach((value, key) => {
                if(value.hasOwnProperty("name") && value.name.localeCompare(deviceName) == 0) {
                    answers.add(key);
                }
            });
            
            resolve(answers);
        });
    }

    public startScanning(): void {
        if(!this.scanning) {
            this.cli.stdin.write("scan on\n");
            this.scanning = true;
        }
    }

    public stopScanning(): void {
        if(this.scanning) {
            this.cli.stdin.write("scan off");
            this.scanning = false;
        }
    }

    public getPairedDevices(): Promise<Array<BTInfo>> {
        return this.getDevices("paired-devices");
    }

    public getPairedDevicesByName(deviceName: string): Promise<Array<BTInfo>> {
        return this.getDevicesByName("paired-devices", deviceName);
    }

    public getKnownDevices(): Promise<Array<BTInfo>> {
        return this.getDevices("devices");
    }

    public getKnownDevicesByName(deviceName: string): Promise<Array<BTInfo>> {
        return this.getDevicesByName("devices", deviceName);
    }

    /**
     * 
     * @param mac The MAC address of the address we connect to
     * @param pairingCode The pairing code. If provided this code will be used 1) To compare the pairing code in the connect prompt and answer yes/no accordingly. 2) If we need to enter a code this code will be used. 3) If null, yes will be sent automatically 
     */
    public pair(mac: string, pairingCode: string = null): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let listener = (data) => {
                let started = false;

                this.parseDataLineByLine(data, (result: REResult) => {
                    if(!started && result.type == LineType.PairIn && result.parsed.mac.localeCompare(mac) == 0) {
                        started = true;
                    } 
                    else if(result.type == LineType.PairConfirmation) {
                        let code: string = result.parsed.code;
                        if(pairingCode == null || code.localeCompare(pairingCode) == 0) 
                            this.cli.stdin.write("yes\n");
                        else 
                            this.cli.stdin.write("no\n");
                    }
                    else if(result.type == LineType.PairSuccess) {
                        this.cli.stdout.removeListener("data", listener);
                        resolve(true);
                    }
                    else if(result.type == LineType.PairFail) {
                        this.cli.stdout.removeListener("data", listener);
                        resolve(false);
                    }

                }, [LineType.PairIn, LineType.PairAttempt, LineType.PairConfirmation, LineType.PairFail, LineType.PairPasskey, LineType.PairSuccess, LineType.Prompt])
            }

            this.cli.stdout.on("data", listener);
            this.cli.stdin.write("pair " + mac + "\n");
        });
    }

    private getDevices(command: string): Promise<Array<BTInfo>> {
        return new Promise<Array<BTInfo>>((resolve, reject) => {
            let startFound: boolean = false;
            let results: Array<BTInfo> = [];

            let dataListener = (data) => {
                // Parse the output line by line
                this.parseDataLineByLine(data, (result: REResult) => {
                    if(!startFound && (result.type == LineType.DevicesIn || result.type == LineType.PairedDevicesIn)) {
                        startFound = true;
                    }
                    // Prompt only shows up after the output of the given command, we should be done now
                    else if(startFound && result.type == LineType.Prompt) {
                        // Remove listener since we are done
                        this.cli.stdout.removeListener("data", dataListener);
                        resolve(results);
                    }
                    // Device lines must be added to the output
                    else if(result.type == LineType.Device) {
                        results.push(result.parsed as BTInfo);
                    }
                }, [LineType.DevicesIn, LineType.PairedDevicesIn, LineType.Prompt, LineType.Device]);
            }
            
            this.cli.stdout.on("data", dataListener);
            this.cli.stdin.write(command + "\n");
        });
    }

    private getDevicesByName(command: string, name: string): Promise<Array<BTInfo>> {
        return new Promise<Array<BTInfo>>((resolve, reject) => {
            // Get all paired devices and filter out the ones we don't need
            this.getDevices(command).then((pairedDevices: BTInfo[]) => {
                let filtered: BTInfo[] = [];

                for(let i = 0; i < pairedDevices.length; i++) {
                    if(pairedDevices[i].name.localeCompare(name) == 0) {
                        filtered.push(pairedDevices[i]);
                    }
                }

                resolve(filtered);
            });
        });
    }

    private attachListeners(): void {
        this.attachNewListener();
        this.attachChangeListener();
        this.attachDeleteListener();
    }

    private attachNewListener(): void {
        this.cli.stdout.on("data", (data) => {
            this.parseDataLineByLine(data, (info: REResult) => {
                if(info.type == LineType.New) {
                    let mac: string = info.parsed.mac;
                    let name: string = info.parsed.name;

                    this.onNewDevice(mac, name);
                }
            }, [LineType.New]);
        });
    }

    private attachChangeListener(): void {
        this.cli.stdout.on("data", (data) => {
            this.parseDataLineByLine(data, (info: REResult) => {
                if(info.type == LineType.Change) {
                    let mac: string = info.parsed.mac;
                    let key: string = info.parsed.key;
                    let value: string = info.parsed.value;
                    this.setDeviceProperty(mac, key, value);

                    if(key.localeCompare("Connected") == 0) {
                        let connected = this.parseDeviceValue(value);
                        if(connected) {
                            this.connected.add(mac);
                        }
                        else {
                            this.connected.delete(mac);
                        }
                    }
                }
            }, [LineType.Change]);
        });
    }

    private attachDeleteListener(): void {
        this.cli.stdout.on("data", (data) => {
            this.parseDataLineByLine(data, (info: REResult) => {
                if(info.type == LineType.Delete) {
                    let mac: string = info.parsed.mac;
                    let name: string = info.parsed.name;
                    
                    this.onDeviceDelete(mac, name);
                }
            }, [LineType.Delete]);
        });
    }

    private setDeviceProperty(mac: string, key: string, value: string) {
        let parsedValue = this.parseDeviceValue(value);

        if(!this.devices.has(mac)) {
            this.devices.set(mac, {});
        }

        this.devices.get(mac)[key] = parsedValue;
    }

    private parseDeviceValue(value: string): any {
        if(value.localeCompare("yes") == 0) 
            return true;
        if(value.localeCompare("no") == 0)
            return false;
        if(value.localeCompare("nil") == 0)
            return null;

        return value;
    }

    private parseLine(line: string, limitTo: LineType[] = null): REResult {
        let matches: RegExpExecArray;

        for(let i = 0; i < RE_ARRAY.length; i++) {
            let regexEntry = RE_ARRAY[i];
            if(limitTo != null && limitTo.indexOf(regexEntry.type) == -1) {
                continue;
            }

            matches = regexEntry.re.exec(line);
            if(matches != null) {
                return {
                    type: regexEntry.type,
                    matches: matches,
                    parsed: regexEntry.parse(matches),
                }
            }
        }

        return {
            type: LineType.Irrelevant,
            matches: null,
            parsed: null,
        }
    }

    private parseDataLineByLine(data, callback: (line: REResult) => void, limitTo: LineType[] = null) {
        let output: string = String.fromCharCode.apply(null, data);
        output = stripAnsi(output);

        let splits: Array<string> = output.split("\n");
        for(let i: number = 0; i < splits.length; i++) {
            let line: string = splits[i];
            let info = this.parseLine(line, limitTo);
            
            callback(info);
        }
    }

    private onNewDevice(mac, name) {
        this.setDeviceProperty(mac, "name", name);
        this.emit("new", mac, name);
    }

    private onDeviceDelete(mac, name) {
        this.devices.delete(mac);
        if(this.connected.has(mac)) {
            this.onDeviceDisconnect(mac, name);
        }
        this.emit("delete", mac, name);
    }

    private onDeviceDisconnect(mac, name) {
        this.connected.delete(mac);
        this.emit("disconnect", mac, name);
    }
}

export { BluetoothCTL, BTInfo };