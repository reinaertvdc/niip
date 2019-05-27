import { Model } from "../util/model";

export interface IProps {
    readonly auth: string;
    readonly company: number;
    readonly email: string;
    readonly first_name: string;
    readonly id: number;
    readonly last_name: string;
    readonly node: number;
    readonly picture: string;
    readonly username: string;
}

export class User extends Model {
    public static readonly tableName: string = "users";

    // tslint:disable-next-line:no-any
    protected static readonly columns: any = Object.freeze({
        auth: "VARCHAR NOT NULL",
        company: "BIGINT NOT NULL",
        company_id: "VARCHAR NOT NULL",
        email: "VARCHAR NOT NULL UNIQUE",
        first_name: "VARCHAR NOT NULL",
        id: "BIGINT PRIMARY KEY",
        last_name: "VARCHAR NOT NULL",
        node: "BIGINT NOT NULL",
        node_id: "VARCHAR NOT NULL",
        picture: "VARCHAR NOT NULL",
        user_id: "VARCHAR NOT NULL UNIQUE",
        username: "VARCHAR NOT NULL UNIQUE",
    });

    // tslint:disable-next-line:no-any
    protected readonly columns: any = User.columns;
    protected readonly tableName: string = User.tableName;

    public async create(props: IProps[]): Promise<null> {
        const values: Array<[
            string,
            number,
            string,
            string,
            string,
            number,
            string,
            number,
            string,
            string,
            string,
            string
        ]> = [];

        props.forEach((value: IProps) => {
            values.push([
                value.auth,
                value.company,
                this.encodeId(value.company),
                value.email,
                value.first_name,
                value.id,
                value.last_name,
                value.node,
                this.encodeId(value.node),
                value.picture,
                this.encodeId(value.id),
                value.username,
            ]);
        });

        return this.insert([
            "auth",
            "company",
            "company_id",
            "email",
            "first_name",
            "id",
            "last_name",
            "node",
            "node_id",
            "picture",
            "user_id",
            "username",
        ], values);
    }

    public async getByAuth(value: string): Promise<any> {
        return (await this.select("auth = $1", [value]))[0];
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
