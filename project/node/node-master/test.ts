import { BluetoothCTL, BTInfo } from "./obd2/bluetoothctl";

let watcher = new BluetoothCTL();

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

    return watcher.getKnownDevicesByName("OBDII");
})
.then((pairedDevices: BTInfo[]) => {
    console.log("Known Devices By Name OBDII:")
    pairedDevices.forEach(element => {
        let keys = Object.keys(element);

        keys.forEach((key) => {
            console.log("\t" + key + ": " + element[key]);
        });
        console.log("\t=======================")
    });

    return watcher.getMAC("OBDII");
})
.then((macs: Set<string>) => {
    console.log("MAC Adresses of OBDII");
    macs.forEach((value) => {
        console.log("\t" + value);
    });

    watcher.startScanning();
    watcher.on("new", (mac: string, name: string) => {
        console.log("New Device: " + mac + " " + name);
        if(name.localeCompare("OP3T") == 0) {
            watcher.pair(mac, null).then((success: boolean) => {
                console.log("Success: " + success);
            });
        }
    });
    watcher.on("delete", (mac, name) => {
        console.log("Deleted Device: " + mac + " " + name);
    });

    return watcher.getMAC("OP3T");
})
.then((macs: Set<string>) => {
    macs.forEach((mac) => {
        console.log("Pairing with: " + mac);
        watcher.pair(mac).then((succes: boolean) => {
            console.log("Paired: " + succes);
        })
    });
})
