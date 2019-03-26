import { OBD2PIDMap } from "./obd2-pidmap";
import { OBD2Interface } from "./obd2-interface"
import { OBD2PID } from "./obd2-pid";

class OBD2DataReader {
	private obdMap: OBD2PIDMap;
	private obdInterface: OBD2Interface;
	private supportedPIDs: Array<number> = [0x00];

	constructor(obd2interface: OBD2Interface) {
		this.obdMap = new OBD2PIDMap();
		this.obdInterface = obd2interface;
	}

	public init(): Promise<void> {
		return this.readSupportedPIDs();
	}

	public getSupportedPIDs(): Array<number> {
		return this.supportedPIDs;
	}

	private readSupportedPIDs(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.getPIDData(0x00, false).then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x20, false);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x40, false);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x60, false);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x80, false);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0xA0, false);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0xC0, false);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				resolve();
			})
			.catch(() => {
				resolve();
			})
		});
	}

	public getAllPIDData(addUnit: boolean = true): Promise<Array<any>> {
		let promise = Promise.all(this.supportedPIDs.map(pidNumber => {
			return this.getPIDData(pidNumber, addUnit).then((data) => {
				return {
					pid: pidNumber,
					info: this.obdMap.get(pidNumber),
					value: data
				};
			});
		}));

		return promise;
	}

	public getPIDData(pidNumber: number, addUnit: boolean = true): any {
		return new Promise((resolve, reject) => {
			if(this.supportedPIDs.indexOf(pidNumber) > -1) {
				let pidString: string = pidNumber.toString(16);
				if(pidNumber < 0x10) {
					pidString = "0" + pidString;
				}
				this.obdInterface.sendCommand("01" + pidString)
				.then((data: any) => {
					resolve(this.parsePIDData(pidNumber, data, addUnit));
				})
				.catch((error) => {
					console.log("Error: " + error);
					reject(error);
				});
			}
			else {
				reject("PIDNotSupportedError: PID number: " + pidNumber + " is not supported.");
			}
		});
	}

	private parsePIDData(pidNumber: number, data: string, addUnit: boolean) {
		let splits: Array<string> = data.split("\r\n");
		let output: string;

		for(var i = 0; i < splits.length; i++) {
			if(splits[i].startsWith("41")) {
				output = splits[i].replace(/ /g, "").substr(4);
				break;
			}
		}

		let byteArray: Uint8Array = Uint8Array.from(Buffer.from(output, "hex"));
		if(this.obdMap.has(pidNumber)) {
			return this.obdMap.get(pidNumber).parse(byteArray, addUnit);
		}
		return byteArray;
	}
}

export { OBD2DataReader }