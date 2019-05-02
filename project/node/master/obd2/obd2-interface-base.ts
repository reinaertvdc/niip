import { EventEmitter } from "events";

type Command = {
    input: string;
    resolve: Function;
    reject: Function;
}

abstract class OBD2InterfaceBase extends EventEmitter {
    constructor() {
        super();
    }

    abstract init(): Promise<void>;
    abstract clear(): void;

    abstract sendCommand(command: string): Promise<Command>;
}

export { OBD2InterfaceBase, Command }