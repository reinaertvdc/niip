import { OBD2Base } from "./obd2-base";
import { OBD2BluetoothWatcher } from "./obd2-bluetooth-watcher";
import { OBD2SerialInterface } from "./obd2-serial-interface";
import { OBD2DataReader } from "./obd2-data-reader";

class OBD2Bluetooth extends OBD2Base {
    private device: string;
    private devicePath: string;
    private serialOptions: any;

    private bluetoothWatcher: OBD2BluetoothWatcher = null;
    private firstConnect: boolean = true;

    private clearOnReconnect: boolean = false;
    
    constructor(device: string, devicePath: string, serialOptions: any, clearOnReconnect: boolean) {
        super();
        this.device = device;
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
                console.log("[BluetoothOBD2] Bluetooth device \"" + this.device);
                this.obd2Interface = obd2interface;
                this.obd2Reader.setInterface(obd2interface);
                this.subscribeOnUpdate()

                if(this.clearOnReconnect) {
                    obd2interface.clearQueue();
                }

                // We will initialise our OBD2Reader if it's not a reconnect
                if(this.firstConnect) {
                    console.log("Initializing reader")
                    this.firstConnect = false;
                    this.obd2Reader.init().then(() => {
                        // Once the OBD2Reader is initalised we are ready ==> resolve our promise
                        console.log("[BluetoothOBD2] Supported PIDs initalized.");
                        console.log(this.obd2Reader.getSupportedPIDs());
                        resolve();
                        this.emit("connect");
                    });
                }
                else {
                    this.emit("connect");
                }
            });

            this.bluetoothWatcher.on("disconnect", () => {
                console.log("[BluetoothOBD2] Bluetooth device \"" + this.device + "\" disconnected.");
                this.emit("disconnect");
            });

            this.bluetoothWatcher.on("error", (error) => {
                console.log("[BluetoothOBD2] Error: " + error);
                this.emit("disconnect");
                this.init();
            });
            
            this.bluetoothWatcher.connectToID(this.device);
        });
    }
}

export { OBD2Bluetooth };