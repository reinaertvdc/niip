import { EventEmitter } from "events";

abstract class OBD2InterfaceBase extends EventEmitter {
    constructor() {
        super();
    }

    abstract init(): Promise<void>;
    abstract clear(): void;

    abstract sendCommand(command: string): Promise<string>;
}

export { OBD2InterfaceBase }