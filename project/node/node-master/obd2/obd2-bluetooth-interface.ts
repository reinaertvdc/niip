import { OBD2InterfaceBase, Command } from "./obd2-interface-base";
const SerialPort = require("serialport");
const Delimiter = require('@serialport/parser-delimiter');

const PID_DATA_RE: RegExp = /(^4[1-9] ?[A-Fa-f0-9]{2})((?: [A-Fa-f0-9]{2})+)/;

type PIDOutput = {
    command: string;
    prefix: string;
    data: string;
}

enum DataType {
    Command,
    Data,
    Stopped,
    Searching,
    UnableToConnect,
    Unknown,
}

class OBD2BluetoothInterface {
    private serial: any = null;
    private parser: any = null;

    private searching: boolean = true;
    private searchInterval: any = null;
    private paused: boolean = true;
    private writing: boolean = false;
    private timeoutReference: any = null;
    private timeout: number = 200;
    private timeoutIncrement: number = 50;
    
    private lastCommand: string = "";
    private pidOutput: PIDOutput = { command: null, prefix: null, data: null };
    private commandQueue: Array<Command> = [];


    constructor() {

    }

    public setInterface(serialPort: any) {
        this.serial = serialPort;
        
        this.parser = this.serial.pipe(new Delimiter({ delimiter: "\r" }));
        this.parser.on("data", (data) => { this.onData(data) });

        this.resume();
    }

    public pause(): void {
        this.paused = true;
    }

    public resume(): void {
        this.paused = false;
        
        if(this.searching) {
            this.startSearch();
        }
        else {
            this.nextWrite();
        }
    }
    
    public clear(): void {
        this.serial = null;
        this.parser = null;

        this.writing = false;
        this.timeoutReference = null;
        this.timeout = 200;
        this.timeoutIncrement = 50;
    }

    public clearOutput(): void {
        this.pidOutput = {
            command: null,
            prefix: null,
            data: null
        }
    }

    public sendCommand(command: string): Promise<Command> {
        if(this.mayWrite()) {
            this.write(command);
        }

        return new Promise<Command>((resolve: Function, reject: Function) => {
            this.commandQueue.push({ input: command, resolve: resolve, reject: reject });
        })
    }

    private mayWrite(): boolean {
        return this.serial.isOpen && !this.writing && !this.paused && !this.searching;
    }

    private write(input: string) {
        this.writing = true;
        
        this.timeoutReference = setTimeout(() => {
            console.log("[OBD2BluetoothInterface] Sending input: " + input);
            this.lastCommand = input;
            this.timeoutReference = null;

            this.serial.write(input + "\r\n");
        }, this.timeout);
    }

    private nextWrite() {
        if(this.commandQueue.length > 0 && !this.paused && !this.searching) {
            let input: string = this.commandQueue[0].input;
            this.write(input);
        }
    }

    private parseData(binaryData: Buffer): DataType {
        let data: string = binaryData.toString("utf-8");
        data = data.trim().replace(">", "");
        let dataLower = data.toLocaleLowerCase();

        if(dataLower.search("stopped") != -1) {
            return DataType.Stopped;
        }

        if(dataLower.search("searching") != -1) {
            return DataType.Searching;
        }

        if(dataLower.search("unable to connect") != -1) {
            return DataType.UnableToConnect;
        }

        if(data.localeCompare(this.lastCommand) == 0) {
            this.pidOutput.command = data;
            return DataType.Command;
        }
        
        let matches: RegExpExecArray = PID_DATA_RE.exec(data);
        if(matches != null && matches.length == 3) {
            this.pidOutput.prefix = matches[1].replace(/ /g, "");
            this.pidOutput.data = matches[2].replace(/ /g, "");
            return DataType.Data;
        }

        return DataType.Unknown;
    }

    private isPIDOutputComplete(): boolean {
        return this.pidOutput.prefix != null &&
               this.pidOutput.command != null &&
               this.pidOutput.data != null;
    }

    private onData(binaryData: Buffer): void {
        let type: DataType = this.parseData(binaryData);

        if(type == DataType.Stopped) {
            this.onStopped();
        }
        else if(type == DataType.Searching) {
            this.onSearching();
        }
        else if(this.isPIDOutputComplete()) {
            this.onAnswer();
        }
    }

    private onSearchData(binaryData: Buffer): void {
        let type: DataType = this.parseData(binaryData);

        if(type == DataType.Stopped) {
            this.onStopped();
        }
        else if(this.isPIDOutputComplete()) {
            this.clearOutput();
            this.stopSearch();
        }   
    }

    private startSearch(): void {
        this.searching = true;
        this.parser.removeAllListeners("data");
        this.parser.on("data", (data: Buffer) => { this.onSearchData(data); });
        
        this.searchInterval = setInterval(() => {
            this.write("0100");
        }, 2000);
    }

    private stopSearch(): void {
        console.log("[OBD2BluetoothInterface] Search mode deactivated, resuming normal mode.")
        clearInterval(this.searchInterval);
        this.searchInterval = null;
        this.parser.removeAllListeners("data");
        this.parser.on("data", (data: Buffer) => {
            this.onData(data);
        });
        this.searching = false;
        this.nextWrite();
    }

    private onStopped(): void {
        console.log("[BluetoothODB2Interface] Sending data too fast, increasing timeout.");

        this.timeout += this.timeoutIncrement;
        this.clearOutput();

        console.log("[OBD2BluetoothInterface] Repeating last command: " + this.lastCommand);
        this.nextWrite();
    }

    private onSearching(): void {
        if(!this.searching) {
            console.log("[OBD2BluetoothInterface] Entering search mode.");
            this.startSearch();
        }
    }

    private onAnswer(): void {
        let candidate = this.searchCommand(this.pidOutput.command);

        if(candidate != null) {
            this.removeCommand(candidate);
            candidate.resolve(this.pidOutput);
        }

        this.clearOutput();
        this.writing = false;
        this.nextWrite();
    }

    private searchCommand(input: string): Command {
        let i: number = 0;
        let element: Command;

        for(i = 0; i < this.commandQueue.length; i++) {
            element = this.commandQueue[i];

            if(input.localeCompare(element.input) == 0) {
                return element;
            }
        }

        return null;
    }

    private removeCommand(command: Command): void {
        let i = 0; 

        for(i = 0; i < this.commandQueue.length; i++) {
            if(command == this.commandQueue[i]) {
                break;
            }
        }

        this.commandQueue.splice(i, 1);
    }
}

export { OBD2BluetoothInterface };