import * as MQTT from "async-mqtt";

import { Process } from "../util/process";

export interface IConfig {
    readonly clientId: string;
    readonly host: string;
    readonly password: string;
    readonly port: number;
    readonly protocol: string;
    readonly username: string;
}

export interface ICredentials {
    readonly clientId: string;
    readonly password: string;
    readonly username: string;
}

export class Mqtt extends Process {
    private client?: MQTT.AsyncClient;
    private readonly credentials: ICredentials;
    private readonly url: string;

    public constructor(config: IConfig) {
        super();

        this.credentials = {
            clientId: config.clientId,
            password: config.password,
            username: config.username,
        };

        this.url = `${config.protocol}://${config.host}:${config.port}`;
    }

    public async publish(id: number|string, message): Promise<void> {
        if (typeof id === "number") { id = this.encodeId(id); }

        await this.client.publish(`d/${id}`, message);
    }

    protected onStart(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            setTimeout(async () => {
                this.client = MQTT.connect(this.url, this.credentials);

                this.client.on("message", this.handleMessage.bind(this));

                await this.client.subscribe("u/+");

                resolve();
            }, 10000);
        });
    }

    protected async onStop(): Promise<void> {
        await (this.client as MQTT.AsyncClient).end();
    }

    private async handleMessage(topic: string, message: string): Promise<void> {
        console.log(topic);
        console.log(message);
    }

    private encodeId(plain: number) {
        const buffer = Buffer.allocUnsafe(6);

        buffer.writeIntBE(plain, 0, 6);

        const base64 = buffer.toString("base64");
        const encoded = base64.replace(/\+/g, "-").replace(/\//g, "_");

        return encoded;
    }

    private decodeId(encoded: string) {
        const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const buffer = Buffer.from(base64, "base64");
        const id = buffer.readIntBE(0, 6);

        return id;
    }
}
