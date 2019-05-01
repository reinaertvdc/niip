import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";
const SerialPort = require("serialport");

class RFCOMM extends EventEmitter {
    private rfcomm: ChildProcessWithoutNullStreams = null;
    private serialPort: any = null;

    constructor(private device: string, private deviceOptions: any, private channel: number = 1) {
        super();
    }

    public connect(mac: string, retry: boolean = true, retries: number = 10, waitTime: number = 5000) {
        let start = Date.now();
        
        if(this.rfcomm != null) {
            //console.log("[RFCOMM] Previous instance still running, killing it.");
            this.rfcomm.kill();
            this.rfcomm = null;
        }
        
        this.rfcomm = spawn("rfcomm", ["connect", this.device, mac, "" + this.channel]); 
        this.rfcomm.stderr.on("data", (data) => {
            data = data.toString("utf-8");
            console.log("[RFCOMM] " + data.trim());
        });
        
        let timeout = setTimeout(() => {
            console.log("[RFCOMM] Mounted device " + mac + " at " + this.device);
            this.onConnect();
        }, 7000);
        
        this.rfcomm.on("exit", (code, signal) => {
            let delta = Date.now() - start;
            let wait = Math.max(waitTime - delta, 0);

            clearTimeout(timeout);
            if(!retry || retries == 0) {
                console.log("[RFCOMM] Failed to mount device " + mac);
                this.onExit(code, signal);
            }
            else {
                console.log("[RFCOMM] Failed to mount device " + mac + ", retrying " + retries + " more times...");
                setTimeout(() => {
                    this.connect(mac, retry, retries - 1);
                }, wait);
            }
        });     
    }
    private onExit(code, signal) {
        if(this.serialPort != null) {
            this.serialPort.close();
            this.serialPort = null;
        }
        this.emit("exit");
    }

    private onConnect() {
        this.serialPort = new SerialPort(this.device, this.deviceOptions);
        this.serialPort.on("error", (error) => { this.onError(error); });
        this.serialPort.on("close", () => { this.onClose(); });
        this.serialPort.on("open", () => { this.onOpen(); });
    }

    private onError(error) {
        this.emit("error", error);
    }

    private onClose() {
        this.serialPort = null;
        this.emit("exit");
    }

    private onOpen() {
        this.emit("open", this.serialPort);
    }
}

export { RFCOMM };