import { OBD2Playback } from "./obd2/obd2-playback";

let obd2 = new OBD2Playback("piddata.txt");

obd2.init().then(() => {
    let loop = (data: any[]) => {
        data.forEach((value) => {
            console.log(value);
        });

        setTimeout(() => {
            obd2.getAllCurrentData(true, true).then(loop);
        }, 1000);
    }

    obd2.getAllCurrentData(true, true).then(loop);
});