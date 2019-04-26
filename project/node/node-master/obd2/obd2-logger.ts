import * as fs from "fs";

class OBD2Logger {
    filename = null;
    
    constructor(filename) {
        this.filename = filename;
    }

    public logCommand(pidNumber: number, data: string) {
        let pidString = pidNumber.toString(16);
        if(pidNumber < 0x10) {
            pidString = "0" + pidString;
        }
        pidString = "01" + pidString;
        let tempString = "" + (Date.now()) + ", " + pidNumber +  ", " + data + "\n";
        
        fs.appendFile(this.filename, tempString, (error) => {
            if(error) {
                console.log("[OBD2Logger] Error appending to file: " + error);
            }
        });
    }
}

export { OBD2Logger }