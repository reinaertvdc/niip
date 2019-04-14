/*
import { BluetoothOBD2 } from "./obd2/bluetooth-obd2";

let obd2 = new BluetoothOBD2("OBDII", "/dev/rfcomm0", {
	"baudRate": 38400
});

obd2.init().then(() => {
	console.log("[Main] BluetoothOBD2 initialised.");
	obd2.getAllCurrentData().then((dataArray: Array<any>) => {
		console.log("[Main] Received all PID data.");
		dataArray.forEach((value) => {
			console.log(value);
		});
	});
});
*/

import { DataProvider } from "./dataprovider/dataprovider";

function randInt(min, max) {
	return new Promise((resolve, reject) => {
		resolve(Math.floor(Math.random() * (max - min)) + min);
	});
}

var provider: DataProvider = DataProvider.getInstance();
provider.register({
	"key": "random-int-10-50",
	"description": "Gets a random integer between 10 and 50.",
	"source": randInt,
	"thisObject": null,
	"arguments": [10, 50]
});


// This is to stop node from closing
setInterval(() => {}, 1 << 30);