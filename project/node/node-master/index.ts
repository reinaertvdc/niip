import { OBD2DataReader } from "./obd2/obd2-data-reader";
import { OBD2Interface } from "./obd2/obd2-interface";


let obdint = new OBD2Interface("/dev/rfcomm0", {
	baudRate: 38400
});

let reader = new OBD2DataReader(obdint);

setTimeout(() => {
	console.log("Initing reader.");
	reader.init().then(() => {
		console.log("Reader inited.");
		console.log("Supported PIDs")
		console.log(reader.getSupportedPIDs());
		reader.getAllPIDData(true).then((dataArray: Array<any>) => {
			dataArray.forEach((value) => {
				console.log(value);
			});
		});
	});
}, 100);

setInterval(() => {}, 1 << 30);