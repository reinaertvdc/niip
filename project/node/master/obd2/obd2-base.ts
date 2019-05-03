import { EventEmitter } from "events";

abstract class OBD2Base extends EventEmitter {
    abstract init(): Promise<void>;

    abstract getCurrentData(PIDNumber: number, parseData: boolean, addUnit: boolean): Promise<any>;
    abstract getAllCurrentData(parseData: boolean, addUnit: boolean): Promise<any[]>;

    abstract getSupportedPIDs(): number[];
    abstract getPIDDescription(pidNumber: number): string;
}

export { OBD2Base };