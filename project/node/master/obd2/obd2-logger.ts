import * as fs from "fs";
import { PIDOutput } from "./obd2-serial-interface";

class OBD2Logger {
    filename = null;
    
    constructor(filename) {
        this.filename = filename;
    }

    public logCommand(data: PIDOutput) {
        let tempString = "" + (Date.now()) + ", " + JSON.stringify(data) + "\n";
        
        fs.appendFile(this.filename, tempString, (error) => {
            if(error) {
                console.log("[OBD2Logger] Error appending to file: " + error);
            }
        });
    }
}

export { OBD2Logger }