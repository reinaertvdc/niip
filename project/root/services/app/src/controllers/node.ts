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
    readonly userId: number;
}

export class Node extends Model {
    public static readonly tableName: string = "vmq_auth_acl";

    // tslint:disable-next-line:no-any
    protected static readonly columns: any = Object.freeze({
        client_id: "CHARACTER VARYING(128) NOT NULL",
        company: `BIGINT NOT NULL REFERENCES ${company.Company.tableName}(id)`,
        company_id: "VARCHAR NOT NULL",
        id: "BIGINT NOT NULL UNIQUE",
        key: "VARCHAR NOT NULL",
        mountpoint: "CHARACTER VARYING(10) NOT NULL",
        password: "CHARACTER VARYING(128)",
        psk: "VARCHAR NOT NULL",
        publish_acl: "JSON",
        ssid: "VARCHAR NOT NULL UNIQUE",
        subscribe_acl: "JSON",
        username: "CHARACTER VARYING(128) NOT NULL",
        usr: "BIGINT",
        usr_id: "VARCHAR",
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
        const values: Array<[
            string,
            number,
            string,
            number,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            number,
            string,
        ]> = [];

        props.forEach((value: IProps) => {
            const id: string = this.encodeId(value.id);
            const ssid = `LogiTrack-${this.encodeId(value.id)}`;

            values.push([
                id,
                value.companyId,
                this.encodeId(value.companyId),
                value.id,
                value.key,
                "",
                bcrypt.hashSync(value.key, this.config.key.saltRounds),
                ssid,
                `[{"pattern": "u/${id}"}]`,
                ssid,
                `[{"pattern": "d/${id}"}]`,
                id,
                value.userId,
                this.encodeId(value.userId),
            ]);
        });

        return this.insert([
            "client_id",
            "company",
            "company_id",
            "id",
            "key",
            "mountpoint",
            "password",
            "psk",
            "publish_acl",
            "ssid",
            "subscribe_acl",
            "username",
            "usr",
            "usr_id",
        ], values);
    }

    public async createRoot(value: IProps, clientId: string, username: string): Promise<null> {
        const values: Array<[
            string,
            number,
            string,
            number,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            number,
            string,
        ]> = [];

        const ssid = `LogiTrack-${this.encodeId(value.id)}`;

        values.push([
            clientId,
            value.companyId,
            this.encodeId(value.companyId),
            value.id,
            value.key,
            "",
            bcrypt.hashSync(value.key, this.config.key.saltRounds),
            ssid,
            `[{"pattern": "d/+"}]`,
            ssid,
            `[{"pattern": "u/+"}]`,
            username,
            value.userId,
            this.encodeId(value.userId),
        ]);

        return this.insert([
            "client_id",
            "company",
            "company_id",
            "id",
            "key",
            "mountpoint",
            "password",
            "psk",
            "publish_acl",
            "ssid",
            "subscribe_acl",
            "username",
            "usr",
            "usr_id",
        ], values);
    }

    public generateKey(): string {
        const buffer: Buffer = crypto.randomBytes(this.config.key.numBytes);

        return buffer.toString("base64");
    }

    public async getById(value: string): Promise<any> {
        // tslint:disable-next-line:no-any
        const result: any = (await this.select("client_id = $1", [value]))[0];

        return {
            companyId: result.company_id,
            id: result.client_id,
            key: result.key,
            psk: result.psk,
            ssid: result.ssid,
            userId: result.usr_id,
        };
    }

    public async getByCompany(value: string): Promise<any[]> {
        console.log(value);

        // tslint:disable-next-line:no-any
        const result: any = (await this.select("company_id = $1", [value]));

        const values = [];

        result.forEach((entry) => {
            values.push({
                companyId: entry.company_id,
                id: entry.client_id,
                key: entry.key,
                psk: entry.psk,
                ssid: entry.ssid,
                userId: entry.usr_id,
            });
        });

        return values;
    }

    public async getAll(): Promise<any[]> {
        // tslint:disable-next-line:no-any
        const result: any = (await this.select("company_id != $1", ["AAAAAAAA"]));

        const values = [];

        result.forEach((entry) => {
            values.push({
                companyId: entry.company_id,
                id: entry.client_id,
                key: entry.key,
                psk: entry.psk,
                ssid: entry.ssid,
                userId: entry.usr_id,
            });
        });

        return values;
    }

    public async verifyKey(id: number, value: string): Promise<boolean> {
        const key: string = (await this.getById(this.encodeId(id))).key;

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
