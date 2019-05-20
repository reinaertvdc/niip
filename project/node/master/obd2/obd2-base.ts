import { EventEmitter } from "events";
import { PIDValueWrapper, OBD2DataReader } from "./obd2-data-reader";
import { OBD2Interface } from "./obd2-interface";

abstract class OBD2Base extends EventEmitter {
    protected obd2Interface: OBD2Interface;
    protected obd2Reader: OBD2DataReader;

    abstract init(): Promise<void>;

    public getCurrentData(PIDNumber: number, parseData: boolean = true, addUnit: boolean = true): Promise<any> {
        return this.obd2Reader.getPIDData(PIDNumber, parseData, addUnit);
    }

    public getAllCurrentData(parseData: boolean = true, addUnit: boolean = true): Promise<PIDValueWrapper[]> {
        return this.obd2Reader.getAllPIDData(parseData, addUnit);
    }

    public getBufferedData(PIDNumber: number, parseData: boolean = true, addUnit: boolean = true): Promise<any> {
        return this.obd2Reader.getBufferedData(PIDNumber, parseData, addUnit);
    }

    public getAllBufferedData(parseData: boolean = true, addUnit: boolean = true): Promise<PIDValueWrapper[]> {
        return this.obd2Reader.getAllBufferedData(parseData, addUnit);
    }

    public getSupportedPIDs(): number[] {
        return this.obd2Reader.getSupportedPIDs();
    }

    public getPIDDescription(pidNumber: number): string {
        return this.obd2Reader.getPIDDescription(pidNumber);
    }

    protected subscribeOnUpdate() {
        this.obd2Reader.on("update", (pids: number[]) => {
            this.emit("update", pids);
        });
    }
}

export { OBD2Base };