import * as influx from "influx";

import { Process } from "../util/process";

export interface IConfig {
    readonly db: string;
    readonly host: string;
    readonly password: string;
    readonly port: number;
    readonly user: string;
}

export class Influx extends Process {
    private readonly config: IConfig;
    private client?: influx.InfluxDB;

    public constructor(config: IConfig) {
        super();

        this.config = config;
    }

    protected async onStart(): Promise<void> {
        this.client = new influx.InfluxDB({
            database: this.config.db,
            host: this.config.host,
            password: this.config.password,
            port: this.config.port,
            username: this.config.user,
            schema: [{

            }],
        });
    }

    protected async onStop(): Promise<void> {

    }
}
