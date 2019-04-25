const ttn = require('ttn');
 
const appID = "logitrack"
const accessKey = "ttn-account-v2.Tg68MYC_BD8eNoXFw0padDHRi0kJS2IMVqySI6VnSFI"
 
//TODO: map LoRa device ID to user/company ID?
class LoRaHelper {
    constructor(appID, accessKey, dataCallback) {
        this._appID = appID;
        this._accessKey = accessKey;
        this._cb = dataCallback;
        this._startHandler();
    }
    _startHandler() {
        ttn.data(this._appID, this._accessKey)
        .then(client => {
            client.on("uplink", (devID, payload) => {
                this._cb(devID, payload);
            })
        })
        .catch(err => {
            console.error(err);
        })
    }
}

let tmp = new LoRaHelper(appID, accessKey, (devID, payload) => {
    console.log("Received uplink from ", devID);
    console.log(payload.payload_raw);
});
 
// // discover handler and open application manager client
// application(appID, accessKey)
//   .then(function (client) {
//     return client.get()
//   })
//   .then(function (app) {
//     console.log("Got app", app)
//   })
//   .catch(function (err) {
//     console.error(err)
//     process.exit(1)
//   })