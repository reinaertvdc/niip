import { OBD2Bluetooth } from "./obd2/obd2-bluetooth";
import { APIServer } from "./api-server/api-server";
import { DataProvider } from "./data-provider/data-provider";
import { OBD2Logger } from "./obd2/obd2-logger";
import { OBD2Base } from "./obd2/obd2-base";
import { OBD2Playback } from "./obd2/obd2-playback";
import { DataRouter } from './data-router/data-router';
import { ConnectionManager, AP, APtype } from './data-router/connection-manager';
import { readFileSync } from "fs";

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
	.option("-I, --interface <interfaces>", "Specify the possible wifi interface names to use as primary interfaces, default \"wlan0,wlp3s0\"", (val)=>{return val.split(',');})
	.option("-l, --login <filename>", "File containing id and password for LogiTrack login", "login.json")
	.option("-u, --userid <id>", "The id used for logging into LogiTrack, overrides login file id", parseInt)
	.option("-p, --password <password>", "The password used for logging into LogiTrack, overrides login file password")
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
let server: APIServer = new APIServer(8945);

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
				"source": obd2.getBufferedData,
				"thisObject": obd2,
				"arguments": [supportedPIDs[i], false, false],
				"description": obd2.getPIDDescription(supportedPIDs[i])
			});

			provider.register({
				"key": "pid-" + supportedPIDs[i] + "-readable",
				"source": obd2.getBufferedData,
				"thisObject": obd2,
				"arguments": [supportedPIDs[i], true, true],
				"description": obd2.getPIDDescription(supportedPIDs[i])
			})

			console.log("[MAIN] Registered PID-%j with DataProvider (%j)", supportedPIDs[i], obd2.getPIDDescription(supportedPIDs[i]));
		}
	});

	obd2.on("disconnect", () => {
		console.log("[MAIN] OBD disconnected, removing sources from dataprovider.");
		for(let i: number = 0; i < supportedPIDs.length; i++) {
			provider.remove("pid-" + supportedPIDs[i]);
			provider.remove("pid-" + supportedPIDs[i] + "-readable");
		}
	});

	obd2.on("update", (pids: number[]) => {
		for (let index = 0; index < pids.length; index++) {
			const pid: number = pids[index];
			provider.announceNewData("pid-" + pid)
			provider.announceNewData("pid-" + pid + "-readable")
		}
	});
}


let login: {id: number|undefined, password: string|undefined} = {id: undefined, password: undefined};
try {
	login = JSON.parse(readFileSync(program.login, 'ascii'));
} catch (e) {}
let id: number|null = null;
let password: string|null = null;
if (program.id !== undefined) {
	id = program.id;
}
else if (login !== undefined && login.id !== undefined && typeof login.id === 'number') {
	id = login.id;
}
if (program.password !== undefined) {
	password = program.password;
}
else if (login !== undefined && login.password !== undefined && typeof login.password === 'string') {
	password = login.password;
}
if (id === null || password === null) {
	console.log('CRITICAL! No username/password specified');
    console.log('\tin file: login.json');
    console.log('\tformat: {"id":<id>,"password":"<password>"}');
}
else {
	let ifaces: string[] = ['wlan0','wlp3s0'];
	if (program.interfaces !== undefined && program.interfaces.length > 0) {
		ifaces = program.interfaces;
	}
	let connector = new ConnectionManager(ifaces, 'LogiTrack-'+id, password, '10.10.10.1');
	let router = new DataRouter(server, id, password, connector);
	//TODO: request extra AP details from server
}


// This is to stop node from closing
setInterval(() => {}, 1 << 30);
