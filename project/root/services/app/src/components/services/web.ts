import * as express from "express";
import * as http from "http";
import * as path from "path";
import * as WebSocket from "ws";

import * as service from "../service";

export interface IConfig {
    readonly port: number;
}

export class Web extends service.Service {
    private readonly app: express.Express;
    private readonly port: number;
    private server?: http.Server;
    private wss?: WebSocket.Server;

    public constructor(config: IConfig) {
        super();

        this.port = config.port;
        this.app = (express as unknown as () => express.Express)();

        this.app.use("/", express.static(path.join(process.cwd(), "public")));
    }

    protected async onStart(): Promise<void> {
        // tslint:disable-next-line:typedef
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => { resolve(); });

                this.wss = new WebSocket.Server({ server: this.server });

                this.wss.on("connection", (ws: WebSocket) => {
                    ws.on("message", (data: string) => {
                        ws.send(data);
                    });
                });
            } catch (error) {
                if (this.wss !== undefined) {
                    this.wss.close();

                    this.wss = undefined;
                }

                this.server = undefined;

                reject(error);
            }
        });
    }

    protected async onStop(): Promise<void> {
        // tslint:disable-next-line:typedef
        return new Promise((resolve, reject) => {
            try {
                (this.wss as WebSocket.Server).close();

                this.wss = undefined;

                (this.server as http.Server).close(() => {
                    this.server = undefined;

                    resolve();
                });
            } catch (error) { reject(error); }
        });
    }
}
