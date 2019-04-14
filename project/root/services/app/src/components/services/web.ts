import * as express from "express";
import * as http from "http";

import * as api from "../servers/api";
import * as ui from "../servers/ui";
import * as service from "../service";

interface IRouteConfig { readonly path: string; }

interface IRoutesConfig {
    readonly api: IRouteConfig;
    readonly ui: IRouteConfig;
}

export interface IConfig {
    readonly port: number;
    readonly routes: IRoutesConfig;
}

export class Web extends service.Service {
    private readonly app: express.Express;
    private readonly port: number;
    private server?: http.Server;

    public constructor(config: IConfig) {
        super();

        this.port = config.port;
        this.app = (express as unknown as () => express.Express)();
        this.server = undefined;

        const r: IRoutesConfig = config.routes;

        this.app.use(r.api.path, new api.Api().getRouter());
        this.app.use(r.ui.path, new ui.Ui().getRouter());
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
        // tslint:disable-next-line:typedef
        return new Promise((resolve, reject) => {
            try {
                (this.server as http.Server).close(() => {
                    this.server = undefined;

                    resolve();
                });
            } catch (error) { reject(error); }
        });
    }
}
