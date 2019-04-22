import * as express from "express";
import * as http from "http";
import * as path from "path";

import { Process } from "../util/process";

import * as db from "./db";

export interface IConfig {
    readonly port: number;
}

export class Web extends Process {
    private readonly app: express.Express;
    private readonly dbService: db.Db;
    private readonly port: number;
    private server?: http.Server;

    public constructor(config: IConfig, dbService: db.Db) {
        super();

        this.port = config.port;
        this.dbService = dbService;
        this.app = (express as unknown as () => express.Express)();

        const uiPath: string = path.join(process.cwd(), "ui", "build");

        this.app.use("/", express.static(uiPath));
    }

    protected async onStart(): Promise<void> {
        // tslint:disable-next-line:typedef
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => { resolve(); });
            } catch (error) {
                this.server = undefined;

                reject(error);
            }
        });
    }

    protected async onStop(): Promise<void> {
        this.server = undefined;
    }
}
