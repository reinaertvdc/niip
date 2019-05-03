import { OBD2BluetoothWatcher } from "./obd2/obd2-bluetooth-watcher";
import { OBD2BluetoothInterface } from "./obd2/obd2-bluetooth-interface";

let watcher = new OBD2BluetoothWatcher("/dev/rfcomm0", {
    baudRate: 38400
});

watcher.on("connect", (obd2: OBD2BluetoothInterface) => {
    let callback = (value) => {
        console.log(value);
    
        setTimeout(() => {
            console.log("[TEST] Sending request.");
            obd2.sendCommand("0100").then(callback);
        }, 5000);
    }
    
    console.log("[TEST] Sending request.");
    obd2.sendCommand("0100").then(callback);
});

watcher.connectToID("OBDII");

/*
import { BluetoothCTL, BTInfo } from "./obd2/bluetoothctl";

let watcher = new BluetoothCTL();
let device = "OP3T";

watcher.getPairedDevices().then((pairedDevices: BTInfo[]) => {
    console.log("Paired Devices:")
    pairedDevices.forEach(element => {
        let keys = Object.keys(element);

        keys.forEach((key) => {
            console.log("\t" + key + ": " + element[key]);
        });
        console.log("\t=======================")
    });

    return watcher.getKnownDevices();
})
.then((pairedDevices: BTInfo[]) => {
    console.log("Known Devices:")
    pairedDevices.forEach(element => {
        let keys = Object.keys(element);

        keys.forEach((key) => {
            console.log("\t" + key + ": " + element[key]);
        });
        console.log("\t=======================")
    });

    return watcher.getKnownDevicesByName(device);
})
.then((knownDevices: BTInfo[]) => {
    console.log("Known Devices By Name " + device + ":")
    knownDevices.forEach(element => {
        let keys = Object.keys(element);
        connect(element.mac);

        keys.forEach((key) => {
            console.log("\t" + key + ": " + element[key]);
        });
        console.log("\t=======================")
    });

    return watcher.getMAC(device, true, false);
})
.then((macs: Set<string>) => {
    console.log("MAC Adresses of " + device + "");
    macs.forEach((value) => {
        console.log("\t" + value);
    });

    watcher.startScanning();
    watcher.on("new", (mac: string, name: string) => {
        console.log("New Device: " + mac + " " + name);
        if(name.localeCompare(device) == 0) {
            watcher.pair(mac, null).then((success: boolean) => {
                console.log("Success: " + success);
            });
        }
    });
    watcher.on("delete", (mac, name) => {
        console.log("Deleted Device: " + mac + " " + name);
    });
});


function connect(mac) {
    
}
*/