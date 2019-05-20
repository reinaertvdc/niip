import { OBD2Base } from "./obd2-base";
import { OBD2PlaybackInterface } from "./obd2-playback-interface";
import { OBD2DataReader } from "./obd2-data-reader";

class OBD2Playback extends OBD2Base {
    private filename: string = null;

    constructor(filename: string) {
        super();
        this.filename = filename;
    }

    public init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.obd2Interface = new OBD2PlaybackInterface(this.filename);
            (this.obd2Interface as OBD2PlaybackInterface).init().then(() => {
                this.obd2Reader = new OBD2DataReader();
                this.obd2Reader.setInterface(this.obd2Interface);
                this.subscribeOnUpdate()
                this.obd2Reader.init().then(() => {
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