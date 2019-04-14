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

    public async insertAnalytics(data: unknown): Promise<void> {
        try {
            let query: string = "INSERT INTO analytics(type, value) VALUES";
            const values: unknown[] = [];
            let i: number = 1;

            // tslint:disable-next-line
            for (const key in data as any) {
                // tslint:disable-next-line
                for (const value of (data as any)[key]) {
                    query += ` ($${i}, $${i + 1}),`;
                    values.push(key);
                    values.push(value);
                    // tslint:disable-next-line:no-magic-numbers
                    i += 2;
                }
            }

            // tslint:disable-next-line:no-magic-numbers
            query = query.substring(0, query.length - 1);

            await this.db.none(query, values);
        } catch (error) {
            await this.db.none(`CREATE TABLE analytics(
                type TEXT NOT NULL,
                value TEXT NOT NULL
            )`);

            let query: string = "INSERT INTO analytics(type, value) VALUES";
            const values: unknown[] = [];
            let i: number = 1;

            // tslint:disable-next-line
            for (const key in data as any) {
                // tslint:disable-next-line
                for (const value of (data as any)[key]) {
                    query += ` ($${i}, $${i + 1}),`;
                    values.push(key);
                    values.push(value);
                    // tslint:disable-next-line:no-magic-numbers
                    i += 2;
                }
            }

            // tslint:disable-next-line:no-magic-numbers
            query = query.substring(0, query.length - 1);

            await this.db.none(query, values);
        }
    }
}
