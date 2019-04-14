import * as WebSocket from "ws";
import * as uuid from "uuid/v4";

interface DataSource {
    key: string,
    description: string,
    source: Function,
    thisObject: Object,
    arguments: Array<any>
}


class DataProvider {
    private static instance: DataProvider = null;

    private dataSources: Map<string, DataSource> = new Map();
    
    private eventMap: Map<string, Function> = new Map();
    private streamMap: Map<string, any> = new Map();

    private wsServer;

    private constructor() {
        this.initEventMap();
        this.createServer();
    }

    /**
     * Function that inits the eventmap, the eventmap is used to bridge incoming events to functions
     * The functions should have 2 parameters: connection, arguments
     */
    private initEventMap() {
        this.onStartDataStream = this.onStartDataStream.bind(this);
        this.onStopDataStream = this.onStopDataStream.bind(this);
        this.onListData = this.onListData.bind(this);
        this.onGetData = this.onGetData.bind(this);
        this.getData = this.getData.bind(this);
        this.getMultipleData = this.getMultipleData.bind(this);

        this.eventMap.set("start-data-stream", this.onStartDataStream);
        this.eventMap.set("stop-data-stream", this.onStopDataStream);
        this.eventMap.set("list-data", this.onListData);
        this.eventMap.set("get-data", this.onGetData);
    }

    private createServer() {
        this.wsServer = new WebSocket.Server({
            port: 8945
        });

        this.wsServer.on("connection", (connection) => {
            this.onConnection(connection);
        });
    }

    private onConnection(connection) {
        connection.on("message", (message) => {
            console.log("[DataProvider] Received message: " + message);
            let parsed = JSON.parse(message);
            this.onMessage(connection, parsed);
        });

        connection.on("error", (error) => {
            console.log("Error=========");
            console.log(error);
        });
    }

    private onMessage(connection, message) {
        if(message.hasOwnProperty("type") && message.hasOwnProperty("data")) {
            var type = message.type;
            
            if(this.eventMap.has(type)) {
                this.eventMap.get(type)(connection, message.data);
            }
        }
    }

    private onGetData(connection, payload) {
        if(payload.hasOwnProperty("sources")) {
            var sources = payload.sources;
            var reply = {
                "type": "get-data", 
                "data": {
                    
                }
            };

            this.getMultipleData(sources).then((output) => {
                reply.data = output;
                connection.send(JSON.stringify(reply));
            })
            .catch((error) => {
                console.log(error);
            });
        }
        else {
            this.sendError(connection, "Wrong format");
        }
    }

    private onStartDataStream(connection, payload) {
        if(payload.hasOwnProperty("sources") &&
           payload.hasOwnProperty("interval")
        ) {
            var streamUUID = uuid();
            var interval = setInterval(() => {
                this.getMultipleData(payload.sources).then((data) => {
                    var reply = {
                        "type": "data-stream-tick",
                        "data": data
                    }
                    reply.data["uuid"] = streamUUID;

                    connection.send(JSON.stringify(reply))
                })
                .catch((error) => {
                    console.log("[DataProvider] Error on interval " + streamUUID + ", closing connection.");
                    clearInterval(interval);
                    this.streamMap.delete(streamUUID);
                    connection.terminate();
                });
            }, payload.interval);

            this.streamMap.set(streamUUID, interval);

            connection.send(JSON.stringify({
                "type": "start-data-stream",
                "data": {
                    "uuid": streamUUID
                }
            }));
        } 
        else {
            this.sendError(connection, "Wrong format.");
        }
    }

    private onStopDataStream(connection, payload) {
        if(payload.hasOwnProperty("uuid")) {
            if(this.eventMap.has(payload.uuid)) {
                clearInterval(payload.uuid);
                connection.send(JSON.stringify({
                    "type": "stop-data-stream",
                    "data": {
                        "success": true
                    }
                }));
            }
            else {
                this.sendError(connection, "UUID not found.");
            }
        }
        else {
            this.sendError(connection, "Wrong format.");
        }
    }

    private onListData(connection, payload) {
        var sourcesIt = this.dataSources.values();
        var sources = [];

        let result = sourcesIt.next();
        while(!result.done) {
            sources.push({
                "key": result.value.key,
                "description": result.value.description
            });
            result = sourcesIt.next();
        }

        connection.send(JSON.stringify({
            "type": "list-data",
            "data": {
                "sources": sources
            }
        }));
    }

    private sendError(connection, error) {
        connection.send(JSON.stringify({
            "type": "error", 
            "data": error
        }));
    }

    public static getInstance(): DataProvider {
        if(DataProvider.instance == null) {
            DataProvider.instance = new DataProvider();
        }
        return DataProvider.instance;
    }

    public has(key: string) {
        return this.dataSources.has(key);
    }

    public getSource(key: string) {
        return this.dataSources.get(key);
    }

    public getData(key: string) {
        var source = this.dataSources.get(key);
        var callback = source.source;
        var args = source.arguments;

        return callback.apply(source.thisObject, args);
    }

    public getMultipleData(keys: Array<string>) {
        return new Promise((resolve, reject) => {
            let response = {};
            let found = [];

            for(var i = 0; i < keys.length; i++) {
                if(this.has(keys[i])) {
                    found.push(keys[i]);
                }
                else {
                    response[keys[i]] = null;
                }
            }
            
            let keySet: Set<string> = new Set(found);

            found.forEach((value, index) => {
                this.getData(value).then((output) => {
                    response[value] = output;
                    keySet.delete(value);

                    if(keySet.size == 0) {
                        resolve(response);
                    }
                });
            });
        });
    }

    public register(source: DataSource) {
        this.dataSources.set(source.key, source);
    }
}

export { DataProvider };