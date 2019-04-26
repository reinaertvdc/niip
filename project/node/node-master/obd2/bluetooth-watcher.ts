import { EventEmitter } from "events";
import { spawn } from "child_process";

import { BluetoothCTL, BTInfo } from "./bluetoothctl";

class BluetoothWatcher extends EventEmitter {
    private name: string;
    private port: string;
    private mac: string;

    private timeout: number = 1 * 1000;
    private maxTimeout: number = 2 * 1 * 1000;
    
    private openConnectionTimer = null;
    private openConnectionTimeout = 10 * 1000;

    private bt: BluetoothCTL = null;

    constructor(devicePort: string) {
        super();
        this.port = devicePort;
        this.bt = new BluetoothCTL();
    }

    public connectToID(deviceName: string) {
        this.name = deviceName;
        this.bt.getMAC(deviceName).then((macs: Set<string>) => {
            if(macs.size == 0) {
                this.bt.startScanning();
                let callback = (mac: string, name: string) => {
                    this.bt.removeListener("new", callback);
                    this.connectToMAC(mac);
                };

                this.bt.on("new", callback);
            }
        });
    }

    public connectToMAC(mac: string) {
        // TODO
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
                //this.setMAC(value);
                this.connect();
            });
        }, this.timeout);

        this.emit("closed", event);
    }

    private onClose(event) {
        console.log("[BT] Closed.");
    }

    private onError(event) {
        console.log("[BT] Error: " + event);
        this.emit("error", event);
    }
}

export { BluetoothWatcher };