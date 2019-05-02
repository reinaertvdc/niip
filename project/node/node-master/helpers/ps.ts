import { exec, ExecException } from "child_process";
import { resolveCname } from "dns";

const PS_RE: RegExp = /^\s?([0-9]+)\s+(\S+)\s+((?:[0-9]{2})(?:\:[0-9]{2}){2})\s+(.+)/gm;

type PSResult = {
    pid: number;
    tty: string;
    time: string;
    name: string;
}

class PS {
    public static get(name: string): Promise<PSResult[]> {
        return new Promise<PSResult[]>((resolve, reject) => {
            let ps = exec("ps -e | grep \"" + name + "\"", (error: ExecException, stdout: string, stderr: string) => {
                if(error) {
                    reject(error);
                    return;
                }
                
                let results: PSResult[] = [];
                let match: RegExpExecArray;

                while (match = PS_RE.exec(stdout)) {
                    results.push({
                        pid: Number.parseInt(match[1]),
                        tty: match[2],
                        time: match[3],
                        name: match[4]
                    });
                }

                resolve(results);
            });
        });
    }
}

export { PS, PSResult };