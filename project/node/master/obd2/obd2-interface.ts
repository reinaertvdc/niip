import * as SerialPort from "serialport";
import * as Regex from "@serialport/parser-regex";
import { OBD2InterfaceBase } from "./obd2-interface-base"

class OBD2Interface extends OBD2InterfaceBase {
	private serialDevice: string;
	private serialOptions: any;
	private serial: SerialPort;
	private parser: any;
	
	private writeBusy: boolean = false;
	private brokenPipe: boolean = false;
	private timeout: number = 200;
	private timeoutIncrement: number = 200;
	
	private lastCommand: string = ""
	private writeQueue: Array<string> = [];
	private answerQueue: Array<{ input: string, resolve: Function, reject: Function}> = [];
	private bufferedData: string = ""

	constructor(serialDevice, serialOptions) {
		super();
		this.onData = this.onData.bind(this);
		this.serialDevice = serialDevice;
		this.serialOptions = serialOptions;
	}

	public init(): Promise<void> {
		return this.open(this.serialDevice, this.serialOptions);
	}

	public clear() {
		this.writeBusy = false;
		this.brokenPipe = false;
		this.timeout = 100;
		this.timeoutIncrement = 50;
		
		this.lastCommand = "";
		this.bufferedData = "";
	}

	public open(port, options): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.serial = new SerialPort(port, options);
			this.serial.on("error", (error) => { this.onError(error); });
			this.serial.on("open", () => {
				this.emit("open");
				resolve();
			});

			this.parser = this.serial.pipe(new Regex({ regex: /\r/ }));
			this.parser.on("data", this.onData);
			this.parser.on("error", (error) => { this.onError(error); });
			this.nextWrite();
		});
	}

	private onData(data: string): void {
		if(this.checkForStopped(data)) {
			return;
		}

		// Check if we find the correct pattern in our data
		this.bufferedData += data + "\r\n";
		if(!/[ -~]+(\r|\n)+[A-Fa-f0-9? ]+\r?\n?\r?\n?/.test(this.bufferedData)) {
			return;
		}
		
		let i: number = 0;
		let element: { input: string, resolve: Function, reject: Function } = null;

		// Loop over our answer queue and see if the input echo in the output matches the elements output.
		for(i = 0; i < this.answerQueue.length; i++) {
			element = this.answerQueue[i];

			if(this.bufferedData.startsWith(">" + element.input) || this.bufferedData.startsWith(element.input)) {
				break;
			}
		}

		// If so call its resolve
		if(i != this.answerQueue.length) {
			this.answerQueue.splice(i, 1);
			element.resolve(this.bufferedData);
		}
		this.bufferedData = "";
		
		if(!this.queueEmpty())
			this.nextWrite();
		else {
			this.writeBusy = false;
		}
	}

	private checkForStopped(data: string): boolean {
		if(data.toLocaleLowerCase().search("stopped") != -1) {
			console.log("[OBD2Interface] Sending data too fast, increasing timeout.");
			this.timeout += this.timeoutIncrement;
			this.bufferedData = "";
			console.log("[OBD2Interface] Repeating command: " + this.lastCommand);
			this.write(this.lastCommand);
			return true;
		}

		return false;
	}

	private onError(error) {
		console.log("[OBD2Interface] " + error);
		this.brokenPipe = true;
		this.emit("error", error);
	}

	public sendCommand(data: string): Promise<string> {
		if(this.mayWrite()) {
			this.write(data);
		}
		else {
			this.writeQueue.push(data);
		}

		// Return a promise, store the resolve functions for later when we receive the reply from this command
		return new Promise<string>((resolve: Function, reject: Function) => {
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
			console.log("Input: " + input);
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