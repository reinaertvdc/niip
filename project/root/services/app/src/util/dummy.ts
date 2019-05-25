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

        const companies = [{
            id: 19667510528945, name: "DHL", nodes: [
                { id: 89684413261313, key: "X4CkHVsySCMZImzm5I/+Z0miXiq3YWidhl4gbkU4V+k=" },
                { id: 130555779191353, key: "pXlJl7SPxT3eH6b/DcH28w5VsCm+TKsd3lxpfT3m5xQ=" },
                { id: 118783228677610, key: "H5OcJSzIWZYPzSpRGAOOFjtUVVWakNU0YEU38dF4tgU=" },
                { id: 101239814388253, key: "Aa2JK9RdJeBtfPq1fcVz4fy1gTc+Gwv/JfUSs12VhUA=" },
                { id: 86360784755548, key: "vNVlqbPdsWBAuKS0ccG5QGkE9G243eDcIVoP9elaOFk=" },
                { id: 32838598655706, key: "krXZnb3ZFHrAXCEbE4xLXZbEtA+WNNX+Ys+qmuaJpYs=" },
                { id: 65103178939626, key: "o6pKGXiQWfe74fiBdRS/HIiGTFBmOskMWugsPDI9sSk=" },
                { id: 129054536807246, key: "x+5n9Ag4A6mAQ53eyTL+eurMMoC89KKPPSdKh7k2Byo=" },
            ],
        }, {
            id: 32656537064832, name: "FedEx", nodes: [
                { id: 7845401048840, key: "Qyp1UeFv3jXEArZ2GCKcb1HAS4W3FTRz7h3NhE9QHpk=" },
                { id: 96286824123626, key: "yCN953eU5mT/Zz8o23XCK0nAC+cLm/qaVQqEvnENX14=" },
                { id: 23988898352140, key: "ZVyLWARlwI/5yORIGgPRJ7qIWVvNuXhtbuuTWnkZCLM=" },
                { id: 66718580440061, key: "TEm1TWOz9D1MZWra/i09P+5uTc0C4cxvi+ZZAiKZxbA=" },
                { id: 53839784260821, key: "IZfNpCM72nRUC1XN/2FaWhWbX4bE8K9JZTc+iBh+yTM=" },
                { id: 135382907479294, key: "grTKgJhf/P82WYs34hATfLDjj/HAnU4ScF4nZDMq58o=" },
            ],
        }, {
            id: 43277205714776, name: "H. Essers", nodes: [
                { id: 49845714439851, key: "8ASVUx420sOSf+nDoVynkuoaWCeo/LJfd0NThweD9Z4=" },
                { id: 103473865979562, key: "ZH/kO0PVZZNHMe2cLB/vkA1DeQdjRISPc95vCrjbR94=" },
                { id: 56257784077459, key: "NW5J8YK5y/jVbrr0XAYnWo9xD0JZfrSo4JkS9bOMCx0=" },
                { id: 120231012180601, key: "x5fpPUJR63feexAM6kgvHLI8WEIAKqZJqOHhO5VsGhc=" },
            ],
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
        }, this.config.mqtt.root.clientId, this.config.mqtt.root.username);
    }
}
