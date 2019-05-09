import { EventEmitter } from "events";
import { PIDValueWrapper, OBD2DataReader } from "./obd2-data-reader";
import { OBD2Interface } from "./obd2-interface";

abstract class OBD2Base extends EventEmitter {
    protected interface: OBD2Interface;
    protected reader: OBD2DataReader;

    abstract init(): Promise<void>;

    public getCurrentData(PIDNumber: number, parseData: boolean = true, addUnit: boolean = true): Promise<any> {
        return this.reader.getPIDData(PIDNumber, parseData, addUnit);
    }

    public getAllCurrentData(parseData: boolean = true, addUnit: boolean = true): Promise<PIDValueWrapper[]> {
        return this.reader.getAllPIDData(parseData, addUnit);
    }

    public getBufferedData(PIDNumber: number, parseData: boolean = true, addUnit: boolean = true): Promise<any> {
        return this.reader.getBufferedData(PIDNumber, parseData, addUnit);
    }

    public getAllBufferedData(parseData: boolean = true, addUnit: boolean = true): Promise<PIDValueWrapper[]> {
        return this.reader.getAllBufferedData(parseData, addUnit);
    }

    public getSupportedPIDs(): number[] {
        return this.reader.getSupportedPIDs();
    }

    public getPIDDescription(pidNumber: number): string {
        return this.reader.getPIDDescription(pidNumber);
    }
}

export { OBD2Base };