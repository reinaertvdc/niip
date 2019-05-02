import * as fs from "fs";
import * as readline from "readline";
import { OBD2InterfaceBase } from "./obd2-interface-base";

interface TimestampedData {
	data: string;
	timestamp: number;
}

class OBD2PlaybackInterface extends OBD2InterfaceBase {
	private filename: string;
	private startTime;
	private dataMap: Map<string, TimestampedData[]> = new Map();

	constructor(filename) {
		super();
		this.filename = filename;
	}

	public init(): Promise<void> {
		return this.initData(this.filename);
	}

	public clear() {
		this.dataMap = new Map();
	}

	public initData(filename: string): Promise<void> {
		return new Promise((resolve, reject) => {
			// Create a stream and read it line by line async
			const readStream = fs.createReadStream(filename);
			const linereader = readline.createInterface({
				input: readStream,
			});

			// Call this function on each new line
			linereader.on("line", (line) => {
				this.onReadLine(line);
			});

			// When we have handled the entire file
			// Emite open and resolve promise
			linereader.on("close", () => {
				this.onFileClose();
				this.emit("open");
				resolve();
			});
		});
	}

	public sendCommand(data: string): Promise<string> {
		// Return a promise, store the resolve functions for later when we receive the reply from this command
		return new Promise<string>((resolve, reject) => {
			resolve(this.lookup(data));
		});
	}

	private onReadLine(line) {
		// Lines have the format
		// <timestamp>, <command>, <binary data in hex>
		// 100323, 0100, deadbeef

		// Split the string on comma and extract data
		const splits: string[] = line.split(",");
		let timestamp: number = 0;
		let pidNumber: string = "";
		let data: string = "";

		if(splits != null && splits.length >= 3) {
			timestamp = parseInt(splits[0], 10);
			pidNumber = splits[1].trim();
			data = splits[2].trim();
		}

		if(!this.dataMap.has(pidNumber)) {
			this.dataMap.set(pidNumber, []);
		}

		this.dataMap.get(pidNumber).push({
			data,
			timestamp,
		});
	}

	private onFileClose() {
		// Data can be insterted in the wrong order
		// Due to the async nature
		// Thus we sort them by timestamp, this function also gives us
		// The first timestamp out of all commands
		const firstTime = this.sortDataByTimestamps();

		// We can use this timestamp to normalize the data timestamps
		this.normalizeTimestamps(firstTime);

		// This timestamp will be used to calculate delta time
		// in the future when data is requested
		this.startTime = Date.now();

		this.printDatamap();
	}

	private sortDataByTimestamps(): number {
		const iterator = this.dataMap.values();
		let value = iterator.next();
		let smallestTime: number = Number.MAX_SAFE_INTEGER;

		// Iterate over all the values and sort on timestamp
		while(!value.done) {
			value.value.sort((a, b) => {
				return a.timestamp - b.timestamp;
			});

			// Keep track of the smallest time
			if(value.value[0].timestamp < smallestTime) {
				smallestTime = value.value[0].timestamp;
			}

			value = iterator.next();
		}

		return smallestTime;
	}

	private normalizeTimestamps(firstTime: number) {
		const iterator = this.dataMap.values();
		let value = iterator.next();

		// Iterate over all the timestamps and substract the first time
		// this way we have normalized all time stamps
		while(!value.done) {
			for(let data of value.value) {
				data.timestamp -= firstTime;
			}

			value = iterator.next();
		}
	}

	private printDatamap() {
		let iterator = this.dataMap.values();
		let value = iterator.next();

		while(!value.done) {
			for(var data of value.value) {
				var timestamp = data.timestamp;
				var binarydata: string = data.data;

				console.log("[" + timestamp + "] " + binarydata);
			}

			value = iterator.next();
		}
	}

	private onError(error) {
		console.log("[OBD2Playback]: " + error);
		this.emit("error", error);
	}
	
	private lookup(data: string): string {
		let time = Date.now();
		let delta = time - this.startTime;
		console.log("Delta: " + delta);

		if(this.dataMap.has(data)) {
			let arr = this.dataMap.get(data);

			for(let i = 0; i < arr.length; i++) {
				var element = arr[i];

				console.log("Timestamp: " + (element.timestamp - delta));
				if(element.timestamp - delta > 0) {
					return element.data;
				}
			}
		}

		return null;
	}
}

export { OBD2PlaybackInterface }