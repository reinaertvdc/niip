import { DataProviderClient } from "../data-provider/data-provider-client";
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
            "sources": ["pid-12-readable", "pid-13-readable", "pid-17-readable", "gps-phone"],
            "interval": 500
        }
    }));
})

setInterval(() => {}, 1 << 30);