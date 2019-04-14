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

    public init(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.bluetoothWatcher = new BluetoothWatcher(this.deviceName, this.devicePath);
        
            this.bluetoothWatcher.on("connected", () => {
                console.log("[BluetoothOBD2] Bluetooth device \"" + this.deviceName + "\" mounted at " + this.devicePath);
                this.obd2Interface.open(this.devicePath, this.serialOptions); 

                if(this.firstConnect) {
                    this.firstConnect = false;
                    this.obd2Reader.init().then(() => {
                        console.log("[BluetoothOBD2] Supported PIDs initalized.");
                        resolve();
                    });
                }
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