import { EventEmitter } from "events";
import { BluetoothCTL, BTInfo } from "../bluetooth/bluetoothctl";
import { OBD2SerialInterface } from "./obd2-serial-interface";
import { RFCOMM } from "../bluetooth/rfcomm";

class OBD2BluetoothWatcher extends EventEmitter {
    private name: string;
    private mac: string;

    private timeout: number = 1 * 1000;
    private maxTimeout: number = 2 * 1 * 1000;
    
    private bt: BluetoothCTL = null;
    private interface: OBD2SerialInterface = null;
    private rfcomm: RFCOMM = null;

    constructor(deviceName, deviceOptions) {
        super();
        this.bt = new BluetoothCTL();
        this.rfcomm = new RFCOMM(deviceName, deviceOptions);
        this.interface = new OBD2SerialInterface();

        this.attachListeners();
    }

    private attachListeners() {
        this.rfcomm.on("open", (serialPort) => {
            this.onConnect(serialPort);
        });

        this.rfcomm.on("exit", () => {
            this.onDisconnect();
        });

        this.rfcomm.on("error", (error) => {
            this.onError(error);
        })
    }

    public connectToID(deviceName: string) {
        this.name = deviceName;
        
        console.log("[BluetoothWatcher] Checking if device [" + deviceName + "] is paired...");
        this.bt.getPairedDevicesByName(deviceName).then((values: BTInfo[]) => {
            if(values.length == 0) {
                console.log("[BluetoothWatcher] Device is not paired, pairing...");
                this.pair(deviceName);
            }
            else {
                console.log("[BluetoothWatcher] Device is paired, retrieving MAC...");
                this.bt.getMAC(deviceName).then((macs: Set<string>) => {
                    let macArray = Array.from(macs);

                    if(macArray.length == 0) {
                        console.log("[BluetoothWatcher] MAC not found, starting scan...");
                        this.bt.startScanning();
                        let callback = (mac: string, name: string) => {
                            console.log("[BluetoothWatcher] Found address " + mac + " during scan, connecting...");
                            this.bt.removeListener("new", callback);
                            this.bt.stopScanning();
                            this.connectToMAC(mac);
                        };
        
                        this.bt.on("new", callback);
                    }
                    else {
                        console.log("[BluetoothWatcher] " + macArray.length + " MAC addresses found, connecting to first...");
                        this.connectToMAC(macArray[0]);
                    }
                });
            }
        });
    }

    public connectToMAC(mac: string) {
        this.mac = mac;
        console.log("[BluetoothWatcher] Connecting to " + mac);
        this.rfcomm.connect(mac, true, 10);
    }

    public pair(deviceName: string) {
        this.bt.getKnownDevicesByName(deviceName).then(async (knownDevices: BTInfo[]) => {
            if(knownDevices.length == 0) {
                let callback = async(mac: string, name: string) => {
                    this.bt.removeListener("new", callback);
                    this.bt.stopScanning();
                    let paired: boolean = await this.bt.pair(mac, "1234");
                    
                    if(!paired) {
                        setTimeout(() => {
                            this.pair(deviceName);
                        }, 1000);
                    }
                }

                this.bt.startScanning();
                this.bt.on("new", callback);
            }
        });
    }

    private onConnect(serialPort) {
        this.interface.setPort(serialPort);
        this.emit("connect", this.interface);
    }

    private onDisconnect() {
        //console.log("[BluetoothWatcher] Connection failed, retrying...");
        this.interface.pause();
        this.emit("disconnect");

        setTimeout(() => {
            //console.log("[BT] Lost connection to device, retrying...");
            if(this.timeout < this.maxTimeout) {
                this.timeout *= 2;
            }

            this.connectToMAC(this.mac);
        }, this.timeout);
    }

    private onError(error) {
        this.emit("error", error);
        console.log("[BluetoothWatcher] RFCOMM error: " + error.toString().trim());
    }
}

export { OBD2BluetoothWatcher };