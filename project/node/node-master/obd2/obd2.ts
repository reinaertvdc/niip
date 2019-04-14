import { OBD2Interface } from "./obd2-interface";
import { OBD2DataReader } from "./obd2-data-reader";
import { EventEmitter } from "events";

class OBD2 {
    protected obd2Interface: OBD2Interface = null;
    protected obd2Reader: OBD2DataReader = null;

    constructor(serialDevice: string, serialOptions) {
        this.obd2Interface = new OBD2Interface(serialDevice, serialOptions);
        this.obd2Reader = new OBD2DataReader(this.obd2Interface);
    }

    public init(): Promise<void> {
        return new Promise(async(resolve, reject) => {
            this.obd2Interface.init();
            await this.obd2Reader.init();
            resolve();
        });
    }

    public getCurrentData(PIDNumber: number, addUnit: boolean = true) {
        return this.obd2Reader.getPIDData(PIDNumber, addUnit);
    }

    public getAllCurrentData(addUnit: boolean = true) {
        return this.obd2Reader.getAllPIDData(addUnit);
    }

    public getSupportedPIDs() {
        return this.obd2Reader.getSupportedPIDs();
    }
}

export { OBD2 }