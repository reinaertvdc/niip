import { OBD2Base } from "./obd2-base";
import { OBD2BluetoothWatcher } from "./obd2-bluetooth-watcher";
import { OBD2SerialInterface } from "./obd2-serial-interface";
import { OBD2DataReader } from "./obd2-data-reader";

class OBD2Bluetooth extends OBD2Base {
    protected obd2Interface: OBD2SerialInterface = null;
    protected obd2Reader: OBD2DataReader  = null;

    private deviceName: string;
    private devicePath: string;
    private serialOptions: any;

    private bluetoothWatcher: OBD2BluetoothWatcher = null;
    private firstConnect: boolean = true;

    private clearOnReconnect: boolean = false;
    
    constructor(deviceName: string, devicePath: string, serialOptions: any, clearOnReconnect: boolean) {
        super();
        this.deviceName = deviceName;
        this.devicePath = devicePath;
        this.serialOptions = serialOptions;
        this.clearOnReconnect = clearOnReconnect;
        this.obd2Reader = new OBD2DataReader();
    }

    /**
     * This function initaliases the bluetooth watcher and will wait for a serial bluetooth connection before 
     * initalising the rest.
     */
    public init(): Promise<void> {
        return new Promise((resolve, reject) => {
            // First we need a bluetooth watcher
            this.bluetoothWatcher = new OBD2BluetoothWatcher(this.devicePath, this.serialOptions);
            
            // When we have a serial bluetooth connection
            this.bluetoothWatcher.on("connect", (obd2interface: OBD2SerialInterface) => {
                console.log("[BluetoothOBD2] Bluetooth device \"" + this.deviceName);
                this.obd2Interface = obd2interface;
                this.obd2Reader.setInterface(obd2interface);

                if(this.clearOnReconnect) {
                    this.obd2Interface.clearQueue();
                }

                // We will initialise our OBD2Reader if it's not a reconnect
                if(this.firstConnect) {
                    this.firstConnect = false;
                    this.obd2Reader.init().then(() => {
                        // Once the OBD2Reader is initalised we are ready ==> resolve our promise
                        console.log("[BluetoothOBD2] Supported PIDs initalized.");
                        console.log(this.obd2Reader.getSupportedPIDs());
                        resolve();
                    });
                }

                this.emit("connect");
            });

            this.bluetoothWatcher.on("disconnect", () => {
                console.log("[BluetoothOBD2] Bluetooth device \"" + this.deviceName + "\" disconnected.");
                this.emit("disconnect");
            });

            this.bluetoothWatcher.on("error", (error) => {
                console.log("[BluetoothOBD2] Error: " + error);
            });

            this.bluetoothWatcher.connectToID(this.deviceName);
        });
    }

    public getCurrentData(PIDNumber: number, parseData: boolean = true, addUnit: boolean = true): Promise<any> {
        return this.obd2Reader.getPIDData(PIDNumber, parseData, addUnit);
    }

    public getAllCurrentData(parseData: boolean = true, addUnit: boolean = true): Promise<Array<any>> {
        return this.obd2Reader.getAllPIDData(parseData, addUnit);
    }

    public getSupportedPIDs(): Array<number> {
        return this.obd2Reader.getSupportedPIDs();
    }

    public getPIDDescription(pidNumber: number): string {
        return this.obd2Reader.getPIDDescription(pidNumber);
    }
}

export { OBD2Bluetooth };