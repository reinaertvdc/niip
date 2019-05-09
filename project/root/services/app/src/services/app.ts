import * as company from "../controllers/company";
import * as node from "../controllers/node";
import { Dummy } from "../util/dummy";
import { Process } from "../util/process";

import * as db from "./db";
import * as web from "./web";

export interface IConfig {
    readonly controllers: {
        readonly node: node.IConfig;
    };
    readonly services: {
        readonly db: db.IConfig;
        readonly web: web.IConfig;
    };
}

export interface ICtrl {
    readonly company: company.Company;
    readonly node: node.Node;
}

export interface ISvc {
    readonly db: db.Db;
    readonly web: web.Web;
}

export class App extends Process {
    private readonly ctrl: ICtrl;
    private readonly svc: ISvc;

    public constructor(config: IConfig) {
        super();

        const dbService: db.Db = new db.Db(config.services.db);

        this.ctrl = Object.freeze({
            company: new company.Company(dbService),
            node: new node.Node(config.controllers.node, dbService),
        });

        this.svc = Object.freeze({
            db: dbService,
            web: new web.Web(config.services.web, this.ctrl),
        });
    }

    protected async onStart(): Promise<void> {
        await this.svc.web.start();

        await this.ctrl.company.init();
        await this.ctrl.node.init();

        await new Dummy(this.ctrl).loadData();
    }

    protected async onStop(): Promise<void> { await this.svc.web.stop(); }
}