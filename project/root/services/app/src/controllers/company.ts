import { Model } from "../util/model";

export interface IProps {
    readonly id: number;
    readonly name: string;
}

export class Company extends Model {
    public static readonly tableName: string = "companies";

    // tslint:disable-next-line:no-any
    protected static readonly columns: any = Object.freeze({
        company: "BIGINT NOT NULL UNIQUE",
        company_id: "VARCHAR NOT NULL UNIQUE",
        id: "BIGINT PRIMARY KEY",
        name: "VARCHAR NOT NULL UNIQUE",
    });

    // tslint:disable-next-line:no-any
    protected readonly columns: any = Company.columns;
    protected readonly tableName: string = Company.tableName;

    public async create(props: IProps[]): Promise<null> {
        const values: Array<[number, string, number, string]> = [];

        props.forEach((value: IProps) => {
            values.push([value.id, this.encodeId(value.id), value.id, value.name]);
        });

        return this.insert(["company", "company_id", "id", "name"], values);
    }

    public async getIdByName(value: string): Promise<number> {
        return (await this.select("name = $1", [value]))[0].id;
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
