import { OBD2Bluetooth } from "./obd2/obd2-bluetooth";
import { DataProvider } from "./dataprovider/data-provider";
import { OBD2Logger } from "./obd2/obd2-logger";
import { OBD2Base } from "./obd2/obd2-base";
import { OBD2Playback } from "./obd2/obd2-playback";

const program = require("commander");

/**
 * INIT CLI
 */
program
	.version("0.1.0")
	.option("-i, --input <filename>", "Use data from a file instead of a real device.")
	.option("-d, --device <device>", "The device we will connect to receive data. Can be a name or MAC address.")
	.option("-s, --serial <path>", "Change the mount place of the serial connection, default /dev/rfcomm0.", "/dev/rfcomm0")
	.option("-b, --baudrate <baudrate>", "Change the baudrate of the serial connection, default 38400", parseInt, 38400)
	.option("-o, --output <filename>", "Save the received data to a file.")
	.parse(process.argv);

/**
 * ERROR CHECKING
 */
if(program.device == undefined && program.input == undefined) {
	console.error("Either --input or --device must be used.");
	process.exit(1);
}

if(program.input && program.device) {
	console.error("Both --input and --device were specified, only one is allowed.");
	process.exit(1);
}

/**
 * INITING VARIABLES
 */
let logger: OBD2Logger = null;
let obd2: OBD2Base = null;
let provider: DataProvider = DataProvider.getInstance();
let supportedPIDs: number[] = [];

if(program.output) {
	console.log("[MAIN] Logger attached, output file: %j", program.output);
	logger = new OBD2Logger(program.output);
}

if(program.device) {
	console.log("[MAIN] Connecting to OBD device: [%j, %j, %j]", program.device, program.serial, program.baudrate);
	obd2 = new OBD2Bluetooth(program.device, program.serial, {
		"baudRate": program.baudrate
	}, true);
}

if(program.input) {
	console.log("[MAIN] Using file %j as input.", program.input);
	obd2 = new OBD2Playback(program.input);
}

obd2.init().then(() => {
	console.log("[MAIN] OBD initialised.");
	let prev = Date.now();
	let start = prev;

	if(logger != null) {
		console.log("[MAIN] Starting log loop.")
		let requestLoop = (data: any[]) => {
			let delta = Date.now() - prev;
			console.log("[MAIN] [%j] Logging %j PID-values", Date.now() - start, data.length);
			data.forEach((output) => {
				logger.logCommand(output.value);
			});

			setTimeout(() => {
				prev = Date.now();
				obd2.getAllCurrentData(false, false).then(requestLoop);
			}, Math.max(500 - delta, 0));
		}

		obd2.getAllCurrentData(false, false).then(requestLoop);
	} 
});

if(logger == null) {
	obd2.on("connect", () => {
		supportedPIDs = obd2.getSupportedPIDs();

		for(let i: number = 0; i < supportedPIDs.length; i++) {
			provider.register({
				"key": "pid-" + supportedPIDs[i],
				"source": obd2.getCurrentData,
				"thisObject": obd2,
				"arguments": [supportedPIDs[i]],
				"description": obd2.getPIDDescription(supportedPIDs[i])
			});

			console.log("[MAIN] Registered PID-%j with DataProvider (%j)", supportedPIDs[i], obd2.getPIDDescription(supportedPIDs[i]));
		}
	});

	obd2.on("disconnect", () => {
		console.log("[MAIN] OBD disconnected, removing sources from dataprovider.");
		for(let i: number = 0; i < supportedPIDs.length; i++) {
			provider.remove("pid-" + supportedPIDs[i]);
		}
	});
}

// This is to stop node from closing
setInterval(() => {}, 1 << 30);
