import { OBD2Logger } from "./obd2/obd2-logger";
import { OBD2Bluetooth } from "./obd2/obd2-bluetooth";
import { PIDOutput } from "./obd2/obd2-interface";


let obd2 = new OBD2Bluetooth("OBDII", "/dev/rfcomm0", {
	"baudRate": 38400
}, true);

let logger = new OBD2Logger("./piddata.txt");

obd2.init().then(() => {
    let requestLoop = (data: any[]) => {
        data.forEach((output) => {
            console.log(output);
            logger.logCommand(output.value);
        });

        obd2.getAllCurrentData(false, false).then(requestLoop);
    }

    obd2.getAllCurrentData(false, false).then(requestLoop);
});