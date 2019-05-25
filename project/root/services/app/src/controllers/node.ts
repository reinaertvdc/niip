import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

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
    public static readonly tableName: string = "vmq_auth_acl";

    // tslint:disable-next-line:no-any
    protected static readonly columns: any = Object.freeze({
        client_id: "CHARACTER VARYING(128) NOT NULL",
        company_id: `BIGINT NOT NULL REFERENCES ${company.Company.tableName}(id)`,
        id: "BIGINT NOT NULL UNIQUE",
        mountpoint: "CHARACTER VARYING(10) NOT NULL",
        password: "CHARACTER VARYING(128)",
        publish_acl: "JSON",
        subscribe_acl: "JSON",
        username: "CHARACTER VARYING(128) NOT NULL",
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
        const values: Array<[string, number, number, string, string, string, string, string]> = [];

        props.forEach((value: IProps) => {
            const id: string = this.encodeId(value.id);

            values.push([
                id,
                value.companyId,
                value.id,
                "",
                bcrypt.hashSync(value.key, this.config.key.saltRounds),
                `[{"pattern": "u/${id}"}]`,
                `[{"pattern": "d/${id}"}]`,
                id,
            ]);
        });

        return this.insert([
            "client_id",
            "company_id",
            "id",
            "mountpoint",
            "password",
            "publish_acl",
            "subscribe_acl",
            "username",
        ], values);
    }

    public async createRoot(value: IProps, clientId: string, username: string): Promise<null> {
        const values: Array<[string, number, number, string, string, string, string, string]> = [];

        values.push([
            clientId,
            value.companyId,
            value.id,
            "",
            bcrypt.hashSync(value.key, this.config.key.saltRounds),
            `[{"pattern": "d/+"}]`,
            `[{"pattern": "u/+"}]`,
            username,
        ]);

        return this.insert([
            "client_id",
            "company_id",
            "id",
            "mountpoint",
            "password",
            "publish_acl",
            "subscribe_acl",
            "username",
        ], values);
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

    private encodeId(plain: number) {
        const buffer = Buffer.allocUnsafe(6);

        buffer.writeIntBE(plain, 0, 6);

        const base64 = buffer.toString("base64");
        const encoded = base64.replace(/\+/g, "-").replace(/\//g, "_");

        return encoded;
    }

    private decodeId(encoded: string) {
        const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const buffer = Buffer.from(base64, "base64");
        const id = buffer.readIntBE(0, 6);

        return id;
    }
}
