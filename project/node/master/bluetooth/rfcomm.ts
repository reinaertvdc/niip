import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";
import { PS, PSResult } from "../helpers/ps";

const SerialPort = require("serialport");

class RFCOMM extends EventEmitter {
    private rfcomm: ChildProcessWithoutNullStreams = null;
    private serialPort: any = null;

    constructor(private device: string, private deviceOptions: any, private channel: number = 1) {
        super();
    }

    public connect(mac: string, retry: boolean = true, retries: number = 10, waitTime: number = 10000) {
        this.killRFCOMM().then(() => {
            this.connectLoop(mac, retry, retries, waitTime);
        })
        .catch((error) => {
            console.log(error);
            this.connectLoop(mac, retry, retries, waitTime);
        })
    }

    private killRFCOMM(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            PS.get("rfcomm").then((results: PSResult[]) => {
                let pids: string[] = [];
                
                for(let i = 0; i < results.length; i++) {
                    pids.push("" + results[i].pid);
                }

                if(pids.length > 0) {
                    console.log("[RFCOMM] Killing rfcomm instances: " + pids.toString());
                    let killCommand = spawn("kill", ["-9", ...pids]);
                    killCommand.on("exit", (code, signal) => {
                        resolve();
                    });
                }
                else {
                    console.log("[RFCOMM] No rfcomm instances to kill.")
                    resolve();
                }
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    private connectLoop(mac: string, retry: boolean, retries: number, waitTime: number) {
        let start = Date.now();
        
        if(this.rfcomm != null) {
            this.rfcomm.kill();
            this.rfcomm = null;
        }
        
        this.rfcomm = spawn("rfcomm", ["connect", this.device, mac, "" + this.channel]); 
        
        let errorCallback = (error: Buffer) => {
            this.onError(error.toString("utf-8"));
        };

        let exitCallback = (code, signal) => {
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
                    this.connectLoop(mac, retry, retries - 1, waitTime);
                }, wait);
            }
        }

        let timeoutCallback = () => {
            console.log("[RFCOMM] Mounted device " + mac + " at " + this.device);
            this.rfcomm.removeListener("exit", exitCallback);
            this.onConnect();
        }
        
        this.rfcomm.stderr.on("data", errorCallback);
        let timeout = setTimeout(timeoutCallback, 7000);
        this.rfcomm.on("exit", exitCallback);  
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