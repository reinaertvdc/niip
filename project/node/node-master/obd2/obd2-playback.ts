import * as fs from "fs";
import * as Regex from "@serialport/parser-regex";
import * as readline from "readline";
import { EventEmitter } from "events";
import { stringify } from "querystring";

class OBD2Playback extends EventEmitter {
    private filename: string;
    private startTime;
    private dataMap: Map<string, Array<any>> = new Map();

	constructor(filename) {
		super();
		this.filename = filename;
	}

	public init(): Promise<any> {
		return this.initData(this.filename);
	}

	public clear() {

	}

	public initData(filename: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let readStream = fs.createReadStream(filename);
            let linereader = readline.createInterface({
                input: readStream
            });

            linereader.on("line", (line) => {
                this.onReadLine(line);
            });


            linereader.on("close", () => {
                this.onFileClose();
                resolve();
            });
        });
    }
    
    private onReadLine(line) {
        var splits: Array<string> = line.split(",");
        var time = parseInt(splits[0]);
        var pidNumber = splits[1].trim();
        var data = Uint8Array.from(Buffer.from(splits[2].trim(), "hex"));

        if(!this.dataMap.has(pidNumber)) {
            this.dataMap.set(pidNumber, []);
        }

        this.dataMap.get(pidNumber).push({
            timestamp: time,
            data: data
        });
    }

    private onFileClose() {
        let firstTime = this.sortDataByTimestamps();
        this.normalizeTimestamps(firstTime);
        this.startTime = Date.now();

        this.printDatamap();
    }

    private sortDataByTimestamps(): number {
        let iterator = this.dataMap.values();
        let value = iterator.next();
        let smallestTime: number = 10000000000000;

        while(!value.done) {
            value.value.sort((a, b) => {
                return a.timestamp - b.timestamp;
            });

            if(value.value[0].timestamp < smallestTime) {
                smallestTime = value.value[0].timestamp;
            }

            value = iterator.next();
        }

        return smallestTime;
    }

    private normalizeTimestamps(firstTime: number) {
        let iterator = this.dataMap.values();
        let value = iterator.next();

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
                var binarydata: Uint8Array = data.data;

                console.log("[" + timestamp + "] " + Buffer.from(binarydata).toString("hex"));
            }

            value = iterator.next();
        }
    }

	private onError(error) {
		console.log("[OBD2Playback]: " + error);
		this.emit("error", error);
	}

	public sendCommand(data: string) {
		// Return a promise, store the resolve functions for later when we receive the reply from this command
		return new Promise((resolve: Function, reject: Function) => {
            resolve(this.lookup(data));
		});
    }
    
    private lookup(data: string): Uint8Array {
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

export { OBD2Playback }