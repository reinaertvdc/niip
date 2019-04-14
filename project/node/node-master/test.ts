import * as WebSocket from "ws";

var ws = new WebSocket("ws://localhost:8945");

ws.on("open", () => {
    console.log("Open");
    ws.send(JSON.stringify({
        "type": "list-data",
        "arguments": {

        }
    }));
});

ws.on("message", (data) => {
    var parsed = JSON.parse(data);
    
    if(parsed.hasOwnProperty("type")) {
        if(parsed.type == "list-data") {
            let sources = parsed.data.sources;   
            let keys = [];

            for(var i = 0; i  < sources.length; i++) {
                keys.push(sources[i].key);
            }

            ws.send(JSON.stringify({
                "type": "start-data-stream",
                "arguments": {
                    "interval": 1000,
                    "sources": keys
                }
            }));
        }
        else {
            console.log(parsed.data);
        }
    }
    


});

// This is to stop node from closing
setInterval(() => {}, 1 << 30);