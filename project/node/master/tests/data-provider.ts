import { DataProviderClient } from "../dataprovider/data-provider-client";
const WebSocket = require("ws");

//var conMan: DataProviderClient = new DataProviderClient("ws://localhost:8945", "wss://logitrack.tk");

// This is to stop node from closing

let socket = new WebSocket("ws://localhost:8945")
socket.on("open", () => {
    socket.on("message", (data) => {
        console.log(data);
    });

    socket.send(JSON.stringify({
        "type": "start-data-stream",
        "data": {
            "sources": ["pid-12", "pid-13", "pid-17"],
            "interval": 500
        }
    }));
})

setInterval(() => {}, 1 << 30);