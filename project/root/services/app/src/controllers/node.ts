import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

import { Db } from "../services/db";
import { Model } from "../util/model";

import * as company from "./company";

export interface IConfig {
    readonly key: {
        numBytes: number;
        saltRounds: number;
    };
}

export interface IProps {
    readonly companyId: number;
    readonly id: number;
    readonly key: string;
}

export class Node extends Model {
    public static readonly tableName: string = "nodes";

    // tslint:disable-next-line:no-any
    protected static readonly columns: any = Object.freeze({
        company_id:
            `BIGINT NOT NULL REFERENCES ${company.Company.tableName}(id)`,
        id: "BIGINT PRIMARY KEY",
        key: "VARCHAR NOT NULL UNIQUE",
    });

    // tslint:disable-next-line:no-any
    protected readonly columns: any = Node.columns;
    protected readonly config: IConfig;
    protected readonly tableName: string = Node.tableName;

    public constructor(config: IConfig, db: Db) {
        super(db);

        this.config = config;
    }

    public async create(props: IProps[]): Promise<null> {
        const values: Array<[number, number, string]> = [];

        props.forEach((value: IProps) => {
            values.push([
                value.id,
                value.companyId,
                bcrypt.hashSync(value.key, this.config.key.saltRounds),
            ]);
        });

        return this.insert(["id", "company_id", "key"], values);
    }

    public generateKey(): string {
        const buffer: Buffer = crypto.randomBytes(this.config.key.numBytes);

        return buffer.toString("base64");
    }

    public async getById(value: number): Promise<IProps> {
        // tslint:disable-next-line:no-any
        const result: any = (await this.select("id = $1", [value]))[0];

        return {
            companyId: result.company_id,
            id: result.id,
            key: result.key,
        };
    }

    public async verifyKey(id: number, value: string): Promise<boolean> {
        const key: string = (await this.getById(id)).key;

        return bcrypt.compare(value, key);
    }
}
