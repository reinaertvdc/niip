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

// This is to stop node from closing
setInterval(() => {}, 1 << 30);