import { Model } from "../util/model";

export interface IProps {
    readonly id: number;
    readonly name: string;
}

export class Company extends Model {
    public static readonly tableName: string = "companies";

    // tslint:disable-next-line:no-any
    protected static readonly columns: any = Object.freeze({
        id: "BIGINT PRIMARY KEY",
        name: "VARCHAR NOT NULL UNIQUE",
    });

    // tslint:disable-next-line:no-any
    protected readonly columns: any = Company.columns;
    protected readonly tableName: string = Company.tableName;

    public async create(props: IProps[]): Promise<null> {
        const values: Array<[number, string]> = [];

        props.forEach((value: IProps) => {
            values.push([value.id, value.name]);
        });

        return this.insert(["id", "name"], values);
    }

    public async getIdByName(value: string): Promise<number> {
        return (await this.select("name = $1", [value]))[0].id;
    }
}
