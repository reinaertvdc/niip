import { OBD2Interface } from "./obd2-interface";
import { OBD2DataReader } from "./obd2-data-reader";
import { OBD2PIDMap } from "./obd2-pidmaps";

class OBD2 {
    protected obd2Interface: OBD2Interface = null;
    protected obd2Reader: OBD2DataReader = null;
    protected pidmap: OBD2PIDMap = null;

    constructor(serialDevice: string, serialOptions) {
        this.pidmap = new OBD2PIDMap();
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

    public getCurrentData(PIDNumber: number, addUnit: boolean = true): Promise<any> {
        return this.obd2Reader.getPIDData(PIDNumber, addUnit);
    }

    public getAllCurrentData(addUnit: boolean = true): Promise<Array<any>> {
        return this.obd2Reader.getAllPIDData(addUnit);
    }

    public getSupportedPIDs(): Array<number> {
        return this.obd2Reader.getSupportedPIDs();
    }

    public getPIDDescription(pidNumber: number): string {
        if(this.pidmap.has(pidNumber)) {
            return this.pidmap.get(pidNumber).description;
        }
        return null;
    }
}

export { OBD2 }