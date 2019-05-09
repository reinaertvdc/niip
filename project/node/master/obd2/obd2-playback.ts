import { OBD2Base } from "./obd2-base";
import { PIDOutput } from "./obd2-serial-interface";
import { OBD2PlaybackInterface } from "./obd2-playback-interface";
import { OBD2DataReader, PIDValueWrapper } from "./obd2-data-reader";

class OBD2Playback extends OBD2Base {
    private filename: string = null;

    constructor(filename: string) {
        super();
        this.filename = filename;
    }

    public init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.interface = new OBD2PlaybackInterface(this.filename);
            (this.interface as OBD2PlaybackInterface).init().then(() => {
                this.reader = new OBD2DataReader();
                this.reader.setInterface(this.interface);
                this.reader.init().then(() => {
                    resolve();
                    this.emit("connect");
                })
            })
            .catch((error) => {
                reject(error);
            });
        });
    }
}

export { OBD2Playback };