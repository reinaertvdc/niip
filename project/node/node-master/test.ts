/*
import { ConnectivityManager } from "./connectivity-manager/connectivity-manager";

var conMan: ConnectivityManager = new ConnectivityManager("ws://localhost:8945", "wss://logitrack.tk");

// This is to stop node from closing
*/

import { OBD2Playback } from "./obd2/obd2-playback"

let obd2 = new OBD2Playback("log.txt");
obd2.init().then(() => {
    obd2.sendCommand("0100").then((data) => {
        console.log(data);
    });
});

setInterval(() => {}, 1 << 30);