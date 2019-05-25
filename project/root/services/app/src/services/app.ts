import * as company from "../controllers/company";
import * as node from "../controllers/node";
import { Dummy, IConfig as IDummyConfig } from "../util/dummy";
import { Process } from "../util/process";

import * as db from "./db";
import * as mqtt from "./mqtt";
import * as web from "./web";

export interface IConfig {
    readonly controllers: {
        readonly node: node.IConfig;
    };
    readonly services: {
        readonly db: db.IConfig;
        readonly mqtt: mqtt.IConfig;
        readonly web: web.IConfig;
    };
    readonly util: {
        readonly dummy: IDummyConfig;
    };
}

export interface ICtrl {
    readonly company: company.Company;
    readonly node: node.Node;
}

export interface ISvc {
    readonly db: db.Db;
    readonly mqtt: mqtt.Mqtt;
    readonly web: web.Web;
}

export interface IUtil {
    readonly dummy: Dummy;
}

export class App extends Process {
    private readonly ctrl: ICtrl;
    private readonly svc: ISvc;
    private readonly util: IUtil;

    public constructor(config: IConfig) {
        super();

        const dbService: db.Db = new db.Db(config.services.db);

        this.ctrl = Object.freeze({
            company: new company.Company(dbService),
            node: new node.Node(config.controllers.node, dbService),
        });

        this.svc = Object.freeze({
            db: dbService,
            mqtt: new mqtt.Mqtt(config.services.mqtt),
            web: new web.Web(config.services.web, this.ctrl),
        });

        this.util = Object.freeze({
            dummy: new Dummy(config.util.dummy, this.ctrl),
        });
    }

    protected async onStart(): Promise<void> {
        await this.svc.web.start();

        await this.ctrl.company.init();
        await this.ctrl.node.init();

        await this.util.dummy.loadData();

        await this.svc.mqtt.start();
    }

    protected async onStop(): Promise<void> {
        await this.svc.mqtt.stop();
        await this.svc.web.stop();
    }
}
