import * as express from "express";
import * as http from "http";
import * as path from "path";
import * as WebSocket from "ws";

import * as node from "../node";
import * as service from "../service";

import * as db from "./db";

export interface IConfig {
    readonly port: number;
}

export class Web extends service.Service {
    private readonly app: express.Express;
    private readonly dbService: db.Db;
    private readonly nodes: Set<node.Node> = new Set();
    private readonly port: number;
    private server?: http.Server;
    private wss?: WebSocket.Server;

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

                this.wss = new WebSocket.Server({ server: this.server });

                this.wss.on("connection", this.handleNewNode.bind(this));
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

    private handleNewNode(ws: WebSocket): void {
        this.nodes.add(new node.Node(
            ws,
            this.dbService,
            this.nodes.delete.bind(this.nodes)));
    }
}
