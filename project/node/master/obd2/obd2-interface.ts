type Command = {
    input: string;
    resolve: Function;
    reject: Function;
}

type PIDOutput = {
    command: string;
    prefix: string;
    data: string;
}

enum DataType {
    Command,
    Data,
    Stopped,
    Searching,
    NoData,
    UnableToConnect,
    Unknown,
}

interface OBD2Interface {
    sendCommand(input: string): Promise<PIDOutput>;
}

export { OBD2Interface, Command, PIDOutput, DataType };