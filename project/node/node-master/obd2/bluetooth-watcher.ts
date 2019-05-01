import { EventEmitter } from "events";
import { BluetoothCTL, BTInfo } from "./bluetoothctl";
import { OBD2BluetoothInterface } from "./obd2-bluetooth-interface";
import { RFCOMM } from "./rfcomm";

class BluetoothWatcher extends EventEmitter {
    private name: string;
    private mac: string;

    private timeout: number = 1 * 1000;
    private maxTimeout: number = 2 * 1 * 1000;
    
    private bt: BluetoothCTL = null;
    private interface: OBD2BluetoothInterface = null;
    private rfcomm: RFCOMM = null;

    constructor(deviceName, deviceOptions) {
        super();
        this.bt = new BluetoothCTL();
        this.rfcomm = new RFCOMM(deviceName, deviceOptions);
        this.interface = new OBD2BluetoothInterface();

        this.attachListeners();
    }

    private attachListeners() {
        this.rfcomm.on("open", (serialPort) => {
            this.interface.setInterface(serialPort);
            this.emit("connect", this.interface);
        });

        this.rfcomm.on("exit", () => {
            console.log("[BluetoothWatcher] Connection failed, retrying...");
            this.interface.pause();
            this.connectToMAC(this.mac);
        });
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

    public onDisconnect(event) {
        this.emit("disconnect", event);

        setTimeout(() => {
            console.log("[BT] Lost connection to device, retrying...");
            if(this.timeout < this.maxTimeout) {
                this.timeout *= 2;
            }

            this.connectToMAC(this.mac);
        }, this.timeout);
    }
}

export { BluetoothWatcher };