import { BluetoothOBD2 } from "./obd2/bluetooth-obd2";
import { DataProvider } from "./dataprovider/dataprovider";

function randInt(min, max) {
	return new Promise((resolve, reject) => {
		resolve(Math.floor(Math.random() * (max - min)) + min);
	});
}

let obd2 = new BluetoothOBD2("OBDII", "/dev/rfcomm0", {
	"baudRate": 38400
});
var provider: DataProvider = DataProvider.getInstance();

obd2.init().then(() => {
	console.log("[Main] BluetoothOBD2 initialised.");
	var supportedPIDs = obd2.getSupportedPIDs();
	
	for(var i = 0; i < supportedPIDs.length; i++) {
		provider.register({
			"key": "pid-" + supportedPIDs[i],
			"source": obd2.getCurrentData,
			"thisObject": obd2,
			"arguments": [supportedPIDs[i]],
			"description": obd2.getPIDDescription(supportedPIDs[i])
		});
	}

	console.log("[Main] Registered PIDs with data provider.");
});

provider.register({
	"key": "random-int-10-50",
	"description": "Gets a random integer between 10 and 50.",
	"source": randInt,
	"thisObject": null,
	"arguments": [10, 50]
});

// This is to stop node from closing
setInterval(() => {}, 1 << 30);