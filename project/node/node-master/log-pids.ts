import { OBD2DataReader } from "./obd2/obd2-data-reader";
import { OBD2Logger } from "./obd2/obd2-logger";
import { BluetoothOBD2 } from "./obd2/bluetooth-obd2";


let obd2 = new BluetoothOBD2("OBDII", "/dev/rfcomm0", {
	"baudRate": 38400
});

let logger = new OBD2Logger("./piddata.txt");

obd2.init().then(() => {
    let requestLoop = () => {

    }

    obd2.getAllCurrentData(false, false).then((data) =>  {
        console.log(data);
    });
});