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

    /**
     * Function that creates our websocket server.
     */
    private createServer() {
        this.wsServer = new WebSocket.Server({
            port: 8945
        });

        this.wsServer.on("connection", (connection) => {
            this.onConnection(connection);
        });
    }

    /**
     * This function is a callback for when there is a new websocket connection
     * @param connection The newly made connection
     */
    private onConnection(connection) {
        // Add a message listener
        connection.on("message", (message) => {
            console.log("[DataProvider] Received message: " + message);
            // We operate in JSON, so parse the string as JSON
            let parsed = JSON.parse(message);
            this.onMessage(connection, parsed);
        });

        // Add error callback
        connection.on("error", (error) => {
            console.log("[DataProvider] Error: " + error);
        });
    }

    /**
     * This function is callback for when a socket receives a new message
     * @param connection The connection that generated the message
     * @param message The new message from the connection, converted to a JSON object.
     */
    private onMessage(connection, message) {
        // Check if the message has the correct structure
        if(message.hasOwnProperty("type") && message.hasOwnProperty("data")) {
            var type = message.type;
            
            // Check if we can handle this event
            if(this.eventMap.has(type)) {
                // If so, call the event
                this.eventMap.get(type)(connection, message.data);
            }
        }
    }

    /**
     * This function is a callback for the "get-data" event. 
     * It will try to collect and send all the data that has been requested.
     * @param connection The connection that generated this event
     * @param payload The payload for this event
     */
    private onGetData(connection, payload) {
        // Check if the payload has the correct structure
        if(payload.hasOwnProperty("sources")) {
            // Extract the data sources
            var sources = payload.sources;
            // Prepare reply
            var reply = {
                "type": "get-data", 
                "data": {
                    
                }
            };

            // Attempt to gather all the data requested in sources and send it
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

    /**
     * This function is a callback for the "start-stream" event. 
     * It will generate a UUID and start a data stream that sends
     * the requested data on the requested interval.
     * @param connection The socket that generated the event.
     * @param payload The payload for the event.
     */
    private onStartDataStream(connection, payload) {
        // Check if the payload has the correct structure
        if(payload.hasOwnProperty("sources") &&
           payload.hasOwnProperty("interval")
        ) {
            // Generate an UUID to identify the stream
            var streamUUID = uuid();
            // Start an interval that gathers and sends the requested data
            var interval = setInterval(() => {
                this.getMultipleData(payload.sources).then((data) => {
                    var reply = {
                        "type": "data-stream-tick",
                        "data": data
                    }
                    // Add the UUID to the data
                    reply.data["uuid"] = streamUUID;

                    connection.send(JSON.stringify(reply))
                })
                // If we get an error here we probably need to close the connection and interval.
                .catch((error) => {
                    console.log("[DataProvider] Error on interval " + streamUUID + ", closing connection.");
                    clearInterval(interval);
                    this.streamMap.delete(streamUUID);
                    connection.terminate();
                });
            }, payload.interval);

            // Save a reference to this interval using the UUID
            this.streamMap.set(streamUUID, interval);

            // Send a reply right now containing the UUID of the stream.
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

    /**
     * This function is a callback for the "stop-data-stream" event.
     * It stops the interval that belongs to the specified stream.
     * @param connection The socket that generated the event.
     * @param payload The payload of the event.
     */
    private onStopDataStream(connection, payload) {
        // Check if the payload has the correct structure
        if(payload.hasOwnProperty("uuid")) {
            // Check if we have an interval with this UUID
            if(this.streamMap.has(payload.uuid)) {
                // If so, stop the interval and send a confirmation
                clearInterval(this.streamMap.get(payload.uuid));
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

    /**
     * This function is a callback for the "list-data" event.
     * It will list all the available data sources.
     * @param connection The socket that generated this event.
     * @param payload The payload of the event
     */
    private onListData(connection, payload) {
        // We loop over our Map using an iterator and store the sources in an array.
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

    /**
     * Wrapper for sending an error to a socket
     * @param connection The socket where we want to send the error to
     * @param error The error to send
     */
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

    /**
     * Function that will try to get the data that was request
     * @param key The data source
     */
    public getData(key: string): Promise<any> {
        var source = this.dataSources.get(key);
        var callback = source.source;
        var args = source.arguments;

        return callback.apply(source.thisObject, args);
    }

    /**
     * Function that will try to get all the data that was requested
     * @param keys The data sources that we will gather
     */
    public getMultipleData(keys: Array<string>) {
        return new Promise((resolve, reject) => {
            let response = {};
            let found = [];
            
            // First, check which sources we have and which we don't have
            for(var i = 0; i < keys.length; i++) {
                if(this.has(keys[i])) {
                    // Add the ones we have to a list
                    found.push(keys[i]);
                }
                else {
                    // For the ones we don't have we just put null in the output
                    response[keys[i]] = null;
                }
            }
            
            // Generate a set from this list 
            // This list indicates which data we still need to gather
            let keySet: Set<string> = new Set(found);

            // For each data source that we do have try to fetch it.
            found.forEach((value, index) => {
                // getData return a promise
                this.getData(value).then((output) => {
                    // Add the data to the response
                    response[value] = output;
                    // Delete this data source from the keyset
                    keySet.delete(value);

                    // If the keyset is empty we have gathered all the data ==> resolve our promise
                    if(keySet.size == 0) {
                        resolve(response);
                    }
                });
            });
        });
    }

    /**
     * This function adds a given data source to our internal list
     * This data source will then be able to be queried by websockets
     * @param source The data source that will be registered
     */
    public register(source: DataSource) {
        this.dataSources.set(source.key, source);
    }
}

export { DataProvider };