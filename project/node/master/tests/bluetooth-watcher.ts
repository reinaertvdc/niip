import { OBD2BluetoothWatcher } from "../obd2/obd2-bluetooth-watcher";
import { OBD2SerialInterface } from "../obd2/obd2-serial-interface";
import { OBD2DataReader } from "../obd2/obd2-data-reader";

let watcher = new OBD2BluetoothWatcher("/dev/rfcomm0", {
    baudRate: 38400
});

let firstConnect = true;
watcher.on("connect", (obd2: OBD2SerialInterface) => {
    if(firstConnect) {
        firstConnect = false;
        let reader = new OBD2DataReader();
        reader.setInterface(obd2);
        reader.getPIDData(0x00, true, true).then((parsedData) => {
            console.log("Parsed data: ");
            console.log(parsedData);
        });
    }
});

watcher.connectToID("OBDII");