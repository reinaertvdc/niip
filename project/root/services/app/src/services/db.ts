import * as crypto from "crypto";
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
    public static generateId(): number {
        const buffer: Buffer = crypto.randomBytes(Db.idNumBytes);

        return Math.abs(buffer.readIntBE(0, buffer.length));
    }

    private static readonly idNumBytes: number = 6;

    private readonly db: pgp.IDatabase<{}>;

    public constructor(config: IConfig) {
        this.db = (pgp as unknown as () => pgp.IMain)()(config.cn);
    }

    // tslint:disable-next-line:no-any
    public async any(query: pgp.TQuery, values?: any): Promise<any[]> {
        return this.db.any(query, values);
    }

    // tslint:disable-next-line:no-any
    public async none(query: pgp.TQuery, values?: any): Promise<null> {
        return this.db.none(query, values);
    }
}
