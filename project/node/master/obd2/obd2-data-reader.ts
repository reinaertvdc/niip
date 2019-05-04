import { OBD2PIDMap } from "./obd2-pidmaps";
import { OBD2Interface } from "./obd2-interface"
import { PIDOutput } from "./obd2-serial-interface";

class OBD2DataReader {
	private obdMap: OBD2PIDMap;
	private obdInterface: OBD2Interface = null;
	private supportedPIDs: Array<number> = [0x00];

	constructor() {
		this.obdMap = new OBD2PIDMap();
	}

	public setInterface(obdInterface: OBD2Interface) {
		this.obdInterface = obdInterface;
	}

	public init(): Promise<void> {
		return this.readSupportedPIDs();
	}

	public getSupportedPIDs(): Array<number> {
		return this.supportedPIDs;
	}

	private readSupportedPIDs(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.supportedPIDs = [0x00];

			this.getPIDData(0x00, true).then((dataArray: Array<number>) => {
				console.log(dataArray);
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x20, true);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x40, true);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x60, true);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0x80, true);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0xA0, true);
			})
			.then((dataArray: Array<number>) => {
				this.supportedPIDs = this.supportedPIDs.concat(dataArray);
				return this.getPIDData(0xC0, true);
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

	public getAllPIDData(parseData: boolean = true, addUnit: boolean = true): Promise<any[]> {
		var promises = [];
		
		for(var i = 0; i < this.supportedPIDs.length; i++) {
			var promise = new Promise((resolve, reject) => {
				var pidNumber = this.supportedPIDs[i];
				this.getPIDData(this.supportedPIDs[i], parseData, addUnit).then((data) => {
					resolve({
						pid: pidNumber,
						description: this.getPIDDescription(pidNumber),
						value: data
					});
				}).catch((error) => {
					reject(error);
				});
			});
			
			promises.push(promise);
		}

		return Promise.all(promises);
	}

	public getPIDData(pidNumber: number, parseData = true, addUnit: boolean = true): Promise<any> {
		return new Promise((resolve, reject) => {
			if(this.supportedPIDs.indexOf(pidNumber) > -1) {
				let pidString: string = pidNumber.toString(16);
				if(pidNumber < 0x10) {
					pidString = "0" + pidString;
				}
				this.obdInterface.sendCommand("01" + pidString)
				.then((data: PIDOutput) => {
					if(parseData) {
						resolve(this.parsePIDData(pidNumber, data.data, addUnit));
					}
					else {
						resolve(data);
					}
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

	public getPIDDescription(pidNumber: number): string {
        if(this.obdMap.has(pidNumber)) {
            return this.obdMap.get(pidNumber).description;
        }
        return null;
    }

	private parsePIDData(pidNumber: number, data: string, addUnit: boolean) {
		let output: string = data;

		let byteArray: Uint8Array = Uint8Array.from(Buffer.from(output, "hex"));
		if(this.obdMap.has(pidNumber)) {
			return this.obdMap.get(pidNumber).parse(byteArray, addUnit);
		}
		return byteArray;
	}
}

export { OBD2DataReader }