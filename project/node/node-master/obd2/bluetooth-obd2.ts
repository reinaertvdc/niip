import { BluetoothWatcher } from "./bluetooth-watcher";
import { OBD2 } from "./obd2";

class BluetoothOBD2 extends OBD2 {
    private deviceName: string;
    private devicePath: string;
    private serialOptions: any;

    private bluetoothWatcher: BluetoothWatcher = null;
    private firstConnect: boolean = true;
    
    constructor(deviceName, devicePath, serialOptions) {
        super(devicePath, serialOptions);
        this.deviceName = deviceName;
        this.devicePath = devicePath;
        this.serialOptions = serialOptions;
    }

    /**
     * This function initaliases the bluetooth watcher and will wait for a serial bluetooth connection before 
     * initalising the rest.
     */
    public init(): Promise<void> {
        return new Promise((resolve, reject) => {
            // First we need a bluetooth watcher
            this.bluetoothWatcher = new BluetoothWatcher(this.deviceName, this.devicePath);
            
            // When we have a serial bluetooth connection
            this.bluetoothWatcher.on("connected", () => {
                console.log("[BluetoothOBD2] Bluetooth device \"" + this.deviceName + "\" mounted at " + this.devicePath);
                // We will connect with this serial interface
                this.obd2Interface.open(this.devicePath, this.serialOptions); 
                // Once this serial connection has been opened
                this.obd2Interface.on("open", () => {
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
                });
            });

            this.bluetoothWatcher.on("closed", () => {
                console.log("[BluetoothOBD2] Bluetooth device \"" + this.deviceName + "\" disconnected.");
            });

            this.bluetoothWatcher.on("error", (error) => {
                console.log("[BluetoothOBD2] Error: " + error);
            });
        });
    }
}

export { BluetoothOBD2 };