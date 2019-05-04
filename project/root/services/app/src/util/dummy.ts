import * as node from "../controllers/node";
import * as app from "../services/app";

export class Dummy {
    private readonly ctrl: app.ICtrl;

    public constructor(ctrl: app.ICtrl) {
        this.ctrl = ctrl;
    }

    public async loadData(): Promise<void> {
        const ctrl: app.ICtrl = this.ctrl;

        const fedExId: number = 43277205714776;
        const hEssersId: number = 19667510528945;
        const dhlId: number = 42656537064832;

        await ctrl.node.clear();
        await ctrl.company.clear();

        await ctrl.company.create([
            { id: fedExId, name: "FedEx" },
            { id: hEssersId, name: "H. Essers" },
            { id: dhlId, name: "DHL" },
        ]);

        const keys: string[] = [
            "X4CkHVsySCMZImzm5I/+Z0miXiq3YWidhl4gbkU4V+k=",
            "pXlJl7SPxT3eH6b/DcH28w5VsCm+TKsd3lxpfT3m5xQ=",
            "H5OcJSzIWZYPzSpRGAOOFjtUVVWakNU0YEU38dF4tgU=",
            "Aa2JK9RdJeBtfPq1fcVz4fy1gTc+Gwv/JfUSs12VhUA=",
            "vNVlqbPdsWBAuKS0ccG5QGkE9G243eDcIVoP9elaOFk=",
            "krXZnb3ZFHrAXCEbE4xLXZbEtA+WNNX+Ys+qmuaJpYs=",
            "o6pKGXiQWfe74fiBdRS/HIiGTFBmOskMWugsPDI9sSk=",
            "x+5n9Ag4A6mAQ53eyTL+eurMMoC89KKPPSdKh7k2Byo=",
            "Qyp1UeFv3jXEArZ2GCKcb1HAS4W3FTRz7h3NhE9QHpk=",
            "yCN953eU5mT/Zz8o23XCK0nAC+cLm/qaVQqEvnENX14=",
            "ZVyLWARlwI/5yORIGgPRJ7qIWVvNuXhtbuuTWnkZCLM=",
            "TEm1TWOz9D1MZWra/i09P+5uTc0C4cxvi+ZZAiKZxbA=",
            "IZfNpCM72nRUC1XN/2FaWhWbX4bE8K9JZTc+iBh+yTM=",
            "grTKgJhf/P82WYs34hATfLDjj/HAnU4ScF4nZDMq58o=",
            "8ASVUx420sOSf+nDoVynkuoaWCeo/LJfd0NThweD9Z4=",
            "ZH/kO0PVZZNHMe2cLB/vkA1DeQdjRISPc95vCrjbR94=",
            "NW5J8YK5y/jVbrr0XAYnWo9xD0JZfrSo4JkS9bOMCx0=",
            "x5fpPUJR63feexAM6kgvHLI8WEIAKqZJqOHhO5VsGhc=",
        ];

        const ids: number[] = [
            // tslint:disable-next-line:no-magic-numbers
            89684413261313,
            // tslint:disable-next-line:no-magic-numbers
            130555779191353,
            // tslint:disable-next-line:no-magic-numbers
            118783228677610,
            // tslint:disable-next-line:no-magic-numbers
            101239814388253,
            // tslint:disable-next-line:no-magic-numbers
            86360784755548,
            // tslint:disable-next-line:no-magic-numbers
            32838598655706,
            // tslint:disable-next-line:no-magic-numbers
            65103178939626,
            // tslint:disable-next-line:no-magic-numbers
            129054536807246,
            // tslint:disable-next-line:no-magic-numbers
            7845401048840,
            // tslint:disable-next-line:no-magic-numbers
            96286824123626,
            // tslint:disable-next-line:no-magic-numbers
            23988898352140,
            // tslint:disable-next-line:no-magic-numbers
            66718580440061,
            // tslint:disable-next-line:no-magic-numbers
            53839784260821,
            // tslint:disable-next-line:no-magic-numbers
            135382907479294,
            // tslint:disable-next-line:no-magic-numbers
            49845714439851,
            // tslint:disable-next-line:no-magic-numbers
            103473865979562,
            // tslint:disable-next-line:no-magic-numbers
            56257784077459,
            // tslint:disable-next-line:no-magic-numbers
            120231012180601,
        ];

        let index: number = 0;
        const nodes: node.IProps[] = [];

        [fedExId, hEssersId, dhlId].forEach((id: number) => {
            // tslint:disable-next-line:no-magic-numbers
            for (let i: number = 0; i < 6; i += 1) {
                nodes.push({
                    companyId: id,
                    id: ids[index],
                    key: keys[index],
                });

                index += 1;
            }
        });

        await ctrl.node.create(nodes);
    }
}
