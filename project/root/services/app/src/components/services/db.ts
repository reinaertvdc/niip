import * as pgp from "pg-promise";

export interface IConfig {
    readonly cn: {
        database: string;
        host: string;
        password: string;
        port: number;
        user: string;
    };
}

export class Db {
    private readonly db: pgp.IDatabase<{}>;

    public constructor(config: IConfig) {
        this.db = (pgp as unknown as () => pgp.IMain)()(config.cn);
    }
}
