import * as SerialPort from "serialport";
import * as Regex from "@serialport/parser-regex";

class OBD2Interface {
	private serial: SerialPort;
	private parser: any;
	private writeBusy: boolean = false;
	private writeQueue: Array<string> = [];
	private answerQueue: Array<{ input: string, resolve: Function, reject: Function}> = [];
	private bufferedData: string = ""

	constructor(port, options) {
		this.onData = this.onData.bind(this);

		this.serial = new SerialPort(port, options);
		this.serial.on("error", (error) => {
			console.log("Error: " + error);
		});
		//this.serial.on("data", (data: Buffer) => {
			//console.log(data.toString());
		//});
		// Read the data when it matches this format
		// Format is as following:
		// 0100\r					// Repeat of the input
		// 41 00 A0 B0 C0 D0\r\r	// Command repeated, output of command, all in hex with spaces between bytes, can be a '?' if command not supported
		this.parser = this.serial.pipe(new Regex({ regex: /\r/ }));
		this.parser.on("data", this.onData);
		this.parser.on("error", (error) => {
			console.log("Error: " + error);
		});
	}

	private onData(data: string): void {

		console.log("==============================");
		console.log(this.bufferedData);
		console.log("------------------------------")
		console.log(data);
		console.log("==============================");
		this.bufferedData += data + "\r\n";
		if(!/[ -~]+(\r|\n)+[A-Fa-f0-9? ]+\r?\n?\r?\n?/.test(this.bufferedData)) {
			return;
		}
		console.log("Matched");
		let i: number = 0;
		let element: { input: string, resolve: Function, reject: Function } = null;

		// Loop over our answer queue and see if the input echo in the output matches the elements output.
		for(i = 0; i < this.answerQueue.length; i++) {
			element = this.answerQueue[i];
			if(this.bufferedData.startsWith(element.input)) {
				break;
			}
		}

		// If so call its resolve
		if(element != null) {
			this.answerQueue = this.answerQueue.splice(i, 1);
			element.resolve(this.bufferedData);
		}
		this.bufferedData = "";
		this.writeBusy = false;
		this.nextWrite();
	}

	public sendCommand(data: string) {
		if(!this.writeBusy) {
			this.write(data);
		}
		else {
			this.writeQueue.push(data);
		}

		// Return a promise, store the resolve functions for later when we receive the reply from this command
		return new Promise((resolve: Function, reject: Function) => {
			this.answerQueue.push({ input: data, resolve: resolve, reject: reject });
		});
	}

	private nextWrite() {
		if(this.writeQueue.length > 0) {
			let write: string = this.writeQueue.shift();
			this.write(write);
		}
	}

	private write(input: string) {
		this.writeBusy = true;
		setTimeout(() => {
			this.serial.write(input + "\r\n", (error) => {
				if(error) {
					console.log("Write error: " + error.message);
				}
			});
		}, 200);
	}
}

export { OBD2Interface }