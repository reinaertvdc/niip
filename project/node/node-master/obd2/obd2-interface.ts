import * as SerialPort from "serialport";
import * as Regex from "@serialport/parser-regex";
import { EventEmitter } from "events";

class OBD2Interface extends EventEmitter {
	private serial: SerialPort;
	private parser: any;
	
	private writeBusy: boolean = false;
	private brokenPipe: boolean = false;
	private timeout: number = 100;
	private timeoutIncrement: number = 50;
	
	private lastCommand: string = ""
	private writeQueue: Array<string> = [];
	private answerQueue: Array<{ input: string, resolve: Function, reject: Function}> = [];
	private bufferedData: string = ""

	constructor(port, options) {
		super();
		this.onData = this.onData.bind(this);
		this.open(port, options);
	}

	public open(port, options) {
		this.serial = new SerialPort(port, options);
		this.serial.on("error", (error) => { this.onError(error); });
		//this.serial.on("data", (data: Buffer) => {
			//console.log(data.toString());
		//});
		// Read the data when it matches this format
		// Format is as following:
		// 0100\r					// Repeat of the input
		// 41 00 A0 B0 C0 D0\r\r	// Command repeated, output of command, all in hex with spaces between bytes, can be a '?' if command not supported
		this.parser = this.serial.pipe(new Regex({ regex: /\r/ }));
		this.parser.on("data", this.onData);
		this.parser.on("error", (error) => { this.onError(error); });
	}

	private onData(data: string): void {
		if(data.toLocaleLowerCase().search("stopped") != -1) {
			console.log("Sending data too fast, increasing timeout.");
			this.timeout += this.timeoutIncrement;
			this.bufferedData = "";
			this.write(this.lastCommand);
			return;
		}

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
		
		if(!this.queueEmpty())
			this.nextWrite();
		else {
			this.writeBusy = false;
		}
	}

	private onError(error) {
		console.log("[OBD2Interface]: " + error);
		this.brokenPipe = true;
		this.emit("error", error);
	}

	public sendCommand(data: string) {
		if(this.mayWrite()) {
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

	private queueEmpty(): boolean {
		return this.writeQueue.length == 0;
	}

	private mayWrite(): boolean {
		return (this.serial.isOpen && !this.brokenPipe && !this.writeBusy);
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
			this.lastCommand = input;
			this.serial.write(input + "\r\n", (error) => {
				if(error) {
					this.onError(error);
				}
			});
		}, this.timeout);
	}
}

export { OBD2Interface }