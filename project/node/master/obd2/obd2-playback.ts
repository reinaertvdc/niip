import { OBD2Base } from "./obd2-base";
import { PIDOutput } from "./obd2-serial-interface";
import { OBD2PlaybackInterface } from "./obd2-playback-interface";
import { OBD2DataReader } from "./obd2-data-reader";

class OBD2Playback extends OBD2Base {
    private filename: string = null;

    private interface: OBD2PlaybackInterface = null;
    private reader: OBD2DataReader = null;

    constructor(filename: string) {
        super();
        this.filename = filename;
    }

    public init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.interface = new OBD2PlaybackInterface(this.filename);
            this.interface.init().then(() => {
                this.reader = new OBD2DataReader();
                this.reader.setInterface(this.interface);
                this.reader.init().then(() => {
                    resolve();
                })
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    public getCurrentData(PIDNumber: number, parseData: boolean = true, addUnit: boolean = true): Promise<any> {
        return this.reader.getPIDData(PIDNumber, parseData, addUnit);
    }

    public getAllCurrentData(parseData: boolean = true, addUnit: boolean = true): Promise<any[]> {
        return this.reader.getAllPIDData(parseData, addUnit);
    }

    public getSupportedPIDs(): number[] {
        return this.reader.getSupportedPIDs();
    }

    public getPIDDescription(pidNumber: number): string {
        return this.reader.getPIDDescription(pidNumber);
    }
}

export { OBD2Playback };