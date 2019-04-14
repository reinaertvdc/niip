import { EventEmitter } from "events";
import { spawn } from "child_process";

import * as util from "util";

class BluetoothWatcher extends EventEmitter {
    private name: string;
    private port: string;
    private mac: string;

    private timeout: number = 1 * 1000;
    private maxTimeout: number = 10 * 60 * 1000;
    
    private openConnectionTimer = null;
    private openConnectionTimeout = 10 * 1000;

    private macRE = /[A-F0-9]{2}(:[A-F0-9]{2}){5}/;

    constructor(deviceName: string, devicePort: string) {
        super()
        this.name = deviceName;
        this.port = devicePort;

        this.searchMAC().then((value) => {
            //console.log("[BT] Found \"" + this.name + "\" at " + value);
            this.setMAC(value);
            //console.log("[BT] Trying to connect...");
            this.connect()
        })
    }

    public setMAC(mac: string) {
        this.mac = mac;
    }

    public searchMAC(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let scan = spawn("bluetoothctl");
            //let grep1 = spawn("grep", [this.name], { stdio: [scan.stdout, "pipe"] });

            scan.stdout.on("data", (data) => {
                // Transform byte array to string
                let output: string = String.fromCharCode.apply(null, data);
                // Process each line
                let splits: Array<string> = output.split("\n");
                
                for(let split in splits) {
                    split = splits[split].trim();
                    let foundNew = false;

                    // The scan can give use lines with [NEW], these 
                    // Can give us the MAC address
                    if(split.search("[NEW]") != -1) {
                        split = split.substr(7);
                        foundNew = true;
                    }
                    
                    // The output of `bluetoothctl
                    if(split.startsWith("Device") || foundNew) {
                        split = split.trim();
                        if(split.endsWith(this.name)) {
                            let mac = this.macRE.exec(split);
                            if(mac != null && mac.length > 0) {
                                scan.stdin.write("exit\n");
                                resolve(mac[0]);
                            }
                        }
                    }
                }
            });

            scan.stdin.write("power on\n");
            scan.stdin.write("scan on\n");
            scan.stdin.write("devices\n");
        });
    }

    public connect() {
        console.log("[BT] Trying to connect to \"" + this.name + "\" at " + this.mac);

        return new Promise((resolve, reject) => {
            let connect = spawn("rfcomm", ["connect", this.port, this.mac, "1"]);
            connect.on("exit", (event) => {
                this.onExit(event);
            });

            connect.on("close", (event) => {
                this.onClose(event);
            });

            connect.on("error", (event) => {
                this.onError(event);
            });

            this.openConnectionTimer = setTimeout(() => {
                this.timeout = 500;
                resolve();
                console.log("[BT] Opened connection on \"" + this.port + "\"");
                this.emit("connected");
            }, this.openConnectionTimeout);
        });
    }

    private onExit(event) {
        if(this.openConnectionTimer != null) {
            clearTimeout(this.openConnectionTimer);
            this.openConnectionTimer = null;
        }

        setTimeout(() => {
            console.log("[BT] Lost connection to device, searching for new device...");
            if(this.timeout < this.maxTimeout) {
                this.timeout *= 2;
            }

            this.searchMAC().then((value) => {
                this.setMAC(value);
                this.connect();
            });
        }, this.timeout);

        this.emit("closed", event);
    }

    private onClose(event) {

    }

    private onError(event) {
        console.log("[BT] Error: " + event);
        this.emit("error", event);
    }
}

export { BluetoothWatcher };