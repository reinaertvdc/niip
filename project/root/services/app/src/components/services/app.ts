import { Service } from "../service";

import * as db from "./db";
import * as web from "./web";

export interface IConfig {
    readonly services: {
        readonly db: db.IConfig;
        readonly web: web.IConfig;
    };
}

export class App extends Service {
    private readonly dbService: db.Db;
    private readonly webService: web.Web;

    public constructor(config: IConfig) {
        super();

        this.dbService = new db.Db(config.services.db);
        this.webService = new web.Web(config.services.web);
    }

    protected async onStart(): Promise<void> { await this.webService.start(); }

    protected async onStop(): Promise<void> { await this.webService.stop(); }
}
