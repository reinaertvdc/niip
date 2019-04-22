import * as express from "express";
import * as http from "http";
import * as path from "path";

import { Process } from "../util/process";

import { Api } from "./api";
import * as app from "./app";

export interface IConfig {
    readonly port: number;
}

export class Web extends Process {
    private readonly api: Api;
    private readonly app: express.Express;
    private readonly ctrl: app.ICtrl;
    private readonly port: number;
    private server?: http.Server;

    public constructor(config: IConfig, ctrl: app.ICtrl) {
        super();

        this.ctrl = ctrl;
        this.port = config.port;
        this.app = (express as unknown as () => express.Express)();

        const uiPath: string = path.join(process.cwd(), "ui", "build");

        this.app.use("/", express.static(uiPath));

        const apiRouter: express.Router = express.Router();

        this.api = new Api(apiRouter, this.ctrl);

        this.app.use("/api", apiRouter);
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
