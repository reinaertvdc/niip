import { Db } from "../services/db";

export abstract class Model {
    // tslint:disable-next-line:no-any
    protected abstract readonly columns: any;
    protected readonly extras: string[] = [];
    protected readonly db: Db;
    protected abstract readonly tableName: string;

    public constructor(db: Db) {
        this.db = db;
    }

    public async clear(): Promise<void> {
        await this.doSafely(this.unsafeClearTable.bind(this));
    }

    public async init(): Promise<null> {
        return this.createTable();
    }

    protected async createTable(): Promise<null> {
        if (!await this.tableExists()) {
            return this.unsafeCreateTable();
        }

        // tslint:disable-next-line:no-null-keyword
        return null;
    }

    protected async doSafely<T>(
        // tslint:disable-next-line:no-any
        action: (...args: any) => Promise<T>, ...args: any
    ): Promise<T> {
        try {
            return await action(...args);
        } catch (error) {
            if (await this.tableExists()) {
                throw error;
            }

            await this.unsafeCreateTable();

            return action(...args);
        }
    }

    protected async dropTable(): Promise<null> {
        return this.doSafely(this.dropTable.bind(this));
    }

    // tslint:disable-next-line:no-any
    protected async insert(keys: string[], values: any[][]): Promise<null> {
        return this.doSafely(this.unsafeInsert.bind(this), keys, values);
    }

    // tslint:disable-next-line:no-any
    protected async select(conditions: string, values?: any): Promise<any[]> {
        return this.doSafely(this.unsafeSelect.bind(this), conditions, values);
    }

    protected async tableExists(): Promise<boolean> {
        const query: string = `SELECT to_regclass('${this.tableName}')`;

        return (await this.db.any(query))[0].to_regclass === this.tableName;
    }

    protected async unsafeClearTable(): Promise<null> {
        return this.db.none(`DELETE FROM ${this.tableName}`);
    }

    protected async unsafeCreateTable(): Promise<null> {
        const separator: string = ", ";
        let query: string = `CREATE TABLE ${this.tableName} (`;

        const keys: string[] = Object.keys(this.columns as object);

        keys.forEach((key: string) => {
            // tslint:disable-next-line:no-unsafe-any
            query += `${key} ${this.columns[key]}${separator}`;
        });

        this.extras.forEach((extra: string) => {
            query += `${extra}${separator}`;
        });

        query = `${query.substring(0, query.length - separator.length)})`;

        return this.db.none(query);
    }

    protected async unsafeDropTable(): Promise<null> {
        return this.db.none(`DROP TABLE ${this.tableName}`);
    }

    // tslint:disable-next-line:no-any
    protected async unsafeInsert(keys: string[], rows: any[][]): Promise<null> {
        let query: string = `INSERT INTO ${this.tableName} (
            ${keys.join(", ")}
        ) VALUES`;

        let i: number = 0;
        // tslint:disable-next-line:no-any
        let values: any[] = [];

        // tslint:disable-next-line:no-any
        rows.forEach((row: any[]) => {
            query += " (";

            // tslint:disable-next-line:no-any
            row.forEach((item: any) => {
                query += `$${i += 1},`;
            });

            query = `${query.substring(0, query.length - 1)}),`;

            values = values.concat(row);
        });

        query = query.substring(0, query.length - 1);

        return this.db.none(query, values);
    }

    protected async unsafeSelect(
        // tslint:disable-next-line:no-any
        conditions: string, values?: any,
        // tslint:disable-next-line:no-any
    ): Promise<any[]> {
        const query: string =
            `SELECT * from ${this.tableName} WHERE ${conditions}`;

        return this.db.any(query, values);
    }
}
