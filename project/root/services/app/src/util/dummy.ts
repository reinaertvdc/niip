import * as node from "../controllers/node";
import * as app from "../services/app";

export interface IConfig {
    readonly mqtt: {
        readonly root: {
            readonly clientId: string;
            readonly password: string;
            readonly username: string;
        };
    };
}

export class Dummy {
    public constructor(private readonly config: IConfig, private readonly ctrl: app.ICtrl) { }

    public async loadData(): Promise<void> {
        const ctrl: app.ICtrl = this.ctrl;

        await ctrl.node.clear();
        await ctrl.company.clear();
        await ctrl.user.clear();

        const companies = [{
            id: 19667510528945, name: "DHL", nodes: [
                { id: 89684413261313, key: "X4CkHVsySCMZImzm5I/+Z0miXiq3YWidhl4gbkU4V+k=", userId: 53607589156759 },
                { id: 130555779191353, key: "pXlJl7SPxT3eH6b/DcH28w5VsCm+TKsd3lxpfT3m5xQ=", userId: 0 },
                { id: 118783228677610, key: "H5OcJSzIWZYPzSpRGAOOFjtUVVWakNU0YEU38dF4tgU=", userId: 101340747090100 },
                { id: 101239814388253, key: "Aa2JK9RdJeBtfPq1fcVz4fy1gTc+Gwv/JfUSs12VhUA=", userId: 0 },
                { id: 86360784755548, key: "vNVlqbPdsWBAuKS0ccG5QGkE9G243eDcIVoP9elaOFk=", userId: 0 },
                { id: 32838598655706, key: "krXZnb3ZFHrAXCEbE4xLXZbEtA+WNNX+Ys+qmuaJpYs=", userId: 0 },
                { id: 65103178939626, key: "o6pKGXiQWfe74fiBdRS/HIiGTFBmOskMWugsPDI9sSk=", userId: 63926351626282 },
                { id: 129054536807246, key: "x+5n9Ag4A6mAQ53eyTL+eurMMoC89KKPPSdKh7k2Byo=", userId: 0 },
            ],
        }, {
            id: 32656537064832, name: "FedEx", nodes: [
                { id: 7845401048840, key: "Qyp1UeFv3jXEArZ2GCKcb1HAS4W3FTRz7h3NhE9QHpk=", userId: 0 },
                { id: 96286824123626, key: "yCN953eU5mT/Zz8o23XCK0nAC+cLm/qaVQqEvnENX14=", userId: 0 },
                { id: 23988898352140, key: "ZVyLWARlwI/5yORIGgPRJ7qIWVvNuXhtbuuTWnkZCLM=", userId: 0 },
                { id: 66718580440061, key: "TEm1TWOz9D1MZWra/i09P+5uTc0C4cxvi+ZZAiKZxbA=", userId: 0 },
                { id: 53839784260821, key: "IZfNpCM72nRUC1XN/2FaWhWbX4bE8K9JZTc+iBh+yTM=", userId: 0 },
                { id: 135382907479294, key: "grTKgJhf/P82WYs34hATfLDjj/HAnU4ScF4nZDMq58o=", userId: 0 },
            ],
        }, {
            id: 43277205714776, name: "H. Essers", nodes: [
                { id: 49845714439851, key: "8ASVUx420sOSf+nDoVynkuoaWCeo/LJfd0NThweD9Z4=", userId: 0 },
                { id: 103473865979562, key: "ZH/kO0PVZZNHMe2cLB/vkA1DeQdjRISPc95vCrjbR94=", userId: 0 },
                { id: 56257784077459, key: "NW5J8YK5y/jVbrr0XAYnWo9xD0JZfrSo4JkS9bOMCx0=", userId: 0 },
                { id: 120231012180601, key: "x5fpPUJR63feexAM6kgvHLI8WEIAKqZJqOHhO5VsGhc=", userId: 0 },
            ],
        }];

        const users = [{
            // ADMIN
            auth: "X8jGhVNuZPXQPo7ZkzJCa9tAUwg1",
            company: 0,
            email: "brent.berghmans@gmail.com",
            first_name: "Brent",
            id: 123634314468204,
            last_name: "Berghmans",
            node: 0,
            // tslint:disable-next-line:max-line-length
            picture: "https://scontent-amt2-1.xx.fbcdn.net/v/t1.0-9/44424318_10217162288400033_6790550093356335104_n.jpg?_nc_cat=105&_nc_ht=scontent-amt2-1.xx&oh=6aed7c8eee55ffef9356bb49ea6d74e1&oe=5D98D57E",
            username: "brbe",
        }, {
            // DRIVER
            auth: "vnDEyDPfWKN9qto94vkXXb00rH82",
            company: 19667510528945,
            email: "amanda.hodson@dhl.com",
            first_name: "Amanda",
            id: 53607589156759,
            last_name: "Hodson",
            node: 89684413261313,
            // tslint:disable-next-line:max-line-length
            picture: "https://free-images.com/lg/7d98/zephyr_teachout.jpg",
            username: "amho",
        }, {
            // DRIVER
            auth: "smmfsshiZoaxFWqnKr7OD6RTSFu2",
            company: 19667510528945,
            email: "nigel.brookes@dhl.com",
            first_name: "Nigel",
            id: 101340747090100,
            last_name: "Brookes",
            node: 118783228677610,
            // tslint:disable-next-line:max-line-length
            picture: "https://free-images.com/lg/0b62/nick_toczek.jpg",
            username: "nabr",
        }, {
            // DRIVER
            auth: "scvRhGrvirT2XGG5Q1YTLsJH76X2",
            company: 19667510528945,
            email: "james.avalos@dhl.com",
            first_name: "James",
            id: 63926351626282,
            last_name: "Avalos",
            node: 65103178939626,
            // tslint:disable-next-line:max-line-length
            picture: "https://free-images.com/lg/6b8b/sharath_haridasan.jpg",
            username: "jaav",
        }, {
            // ANALYST
            auth: "PY4HhnnQ7JQ07OpUPIO4wxdJgqD3",
            company: 19667510528945,
            email: "nancie.edge@dhl.com",
            first_name: "Nancie",
            id: 130631078155093,
            last_name: "Edge",
            node: 0,
            // tslint:disable-next-line:max-line-length
            picture: "https://free-images.com/lg/6ea4/osene_odia_ighodaro.jpg",
            username: "naed",
        }];

        const comps: any = [];
        const nodes: node.IProps[] = [];

        companies.forEach(async (company) => {
            comps.push({ id: company.id, name: company.name });

            company.nodes.forEach((n) => {
                nodes.push({
                    companyId: company.id,
                    id: n.id,
                    key: n.key,
                    userId: n.userId,
                });
            });
        });

        await ctrl.company.create(comps);
        await ctrl.node.create(nodes);

        await ctrl.company.create([{ id: 0, name: "" }]);

        await ctrl.node.createRoot({
            companyId: 0,
            id: 0,
            key: this.config.mqtt.root.password,
            userId: 0,
        }, this.config.mqtt.root.clientId, this.config.mqtt.root.username);

        await ctrl.user.create(users);
    }
}
