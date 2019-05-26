import * as ws from 'ws';
// const ws = require("ws");
const uuid = require("uuid/v4");
const bonjour = require("bonjour")();

import { DataProvider, DataDescription } from "../data-provider/data-provider";
import { EventEmitter } from "events";

type LatePromise = {
    uuid: string,
    resolve: Function,
    reject: Function
}

class APIServer extends EventEmitter {
    private eventMap: Map<string, Function> = new Map();
    private streamMap: Map<string, any> = new Map();
    private mqttForward: Set<any> = new Set();
    private dataConnections: Map<any, Set<string>> = new Map();
    private dataWaitList: Map<string, Array<LatePromise>> = new Map();

    private wsServer: ws.Server|undefined;
    private dataProvider: DataProvider;

    public constructor(port: number) {
        super()
        this.dataProvider = DataProvider.getInstance();
        this.initEventMap();
        this.createServer(port);
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
        this.onAdvertiseData = this.onAdvertiseData.bind(this);
        this.onAdvertiseMQTTForward = this.onAdvertiseMQTTForward.bind(this);
        this.onMQTTForward = this.onMQTTForward.bind(this);
        this.onStartMQTT = this.onStartMQTT.bind(this);
        this.onStopMQTT = this.onStopMQTT.bind(this);
        this.onProvideData = this.onProvideData.bind(this);

        this.eventMap.set("start-data-stream", this.onStartDataStream);
        this.eventMap.set("stop-data-stream", this.onStopDataStream);
        this.eventMap.set("list-data", this.onListData);
        this.eventMap.set("get-data", this.onGetData);
        this.eventMap.set("start-mqtt", this.onStartMQTT);
        this.eventMap.set("stop-mqtt", this.onStopMQTT);
        this.eventMap.set("mqtt-forward", this.onMQTTForward);
        this.eventMap.set("advertise-mqtt-forward", this.onAdvertiseMQTTForward);
        this.eventMap.set("advertise-data", this.onAdvertiseData);
        this.eventMap.set("provide-data", this.onProvideData);
    }

    /**
     * Function that creates our websocket server.
     */
    private createServer(port: number) {
        this.wsServer = new ws.Server({
            port
        });

        this.wsServer.on("connection", (connection) => {
            this.onConnection(connection);
        });

        bonjour.publish({
            name: "LogiTrack Node API",
            type: "lgtrack_api",
            port: port
        });
    }

        /**
     * This function is a callback for when there is a new websocket connection
     * @param connection The newly made connection
     */
    private onConnection(connection) {
        console.log("[DataProvider] New connection: " + connection);
        // Add a message listener
        connection.on("message", (message) => {
            console.log("[DataProvider] Received message: " + message);
            // We operate in JSON, so parse the string as JSON
            let parsed = JSON.parse(message);
            this.onMessage(connection, parsed);
        });

        connection.on("close", () => {
            console.log("[DataProvider] Socket closed, terminating.")
            this.removeMQTTConnection(connection)
            this.removeDataConnection(connection)
            connection.terminate()
        })

        // Add error callback
        connection.on("error", (error) => {
            this.removeMQTTConnection(connection)
            this.removeDataConnection(connection)
            console.log("[DataProvider] Error: " + error);
        });
    }

    private removeMQTTConnection(connection) {
        if(this.mqttForward.has(connection)) {
            this.mqttForward.delete(connection)
            this.emit("mqtt-forwarder-removed")
        }
    }

    private removeDataConnection(connection) {
        if(this.dataConnections.has(connection)) {
            let keys: Set<string> = this.dataConnections.get(connection)
            
            keys.forEach(key => {
                console.log("[APIServer] Removed key " + key)
                DataProvider.getInstance().remove(key)
            });
            
    
            this.dataConnections.delete(connection)
        }
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
            this.dataProvider.getMultipleData(sources).then((output) => {
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
                this.dataProvider.getMultipleData(payload.sources).then((data) => {
                    var reply = {
                        "type": "data-stream-tick",
                        "data": data
                    }
                    // Add the UUID to the data
                    reply.data["uuid"] = streamUUID;
                    console.log("Sent: " + reply)
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
        let sources: DataDescription[] = this.dataProvider.getSources();

        connection.send(JSON.stringify({
            "type": "list-data",
            "data": {
                "sources": sources
            }
        }));
    }

    private onAdvertiseMQTTForward(connection, payload) {
        this.mqttForward.add(connection)
        this.emit("mqtt-forwarder-added", connection)
    }

    private onStartMQTT(connection, payload) {
        this.emit("mqtt-forwarder-ready", connection)
    }

    private onStopMQTT(connection, payload) {
        this.emit("mqtt-forwarder-stopped", connection)
    }

    private onMQTTForward(connection, payload) {
        if(payload.hasOwnProperty("data")) {
            this.emit("mqtt-forward", payload.data)
        }
    }

    private onAdvertiseData(connection, payload, event) {
        this.addDataConnection(connection, payload.key, payload.event, payload.description)
    }

    private onProvideData(connection, payload) {
        if(payload.hasOwnProperty("key")) {
            let key: string = payload.key
            delete payload.key

            if(this.dataWaitList.has(key)) {
                this.dataWaitList.get(key).forEach(latePromise => {
                    latePromise.resolve(payload)
                });

                this.dataWaitList.set(key, [])
            }
        }
    }

    private addDataConnection(connection, key, event, description) {
        if(!this.dataConnections.has(connection)) {
            this.dataConnections.set(connection, new Set())
        }

        let keySet = this.dataConnections.get(connection)
        if(!keySet.has(key)) {
            keySet.add(key)
            DataProvider.getInstance().register({
				"key": key,
				"source": this.getDataFromConnection,
				"thisObject": this,
				"arguments": [connection, key, event],
				"description": description
			})
        }
    }

    public getDataFromConnection(connection, key, event) {
        let promise = new Promise<any>((resolve, reject) => {
            let latePromise = {
                uuid: uuid(),
                resolve,
                reject
            }

            if(!this.dataWaitList.has(key)) {
                this.dataWaitList.set(key, [])
            }
            this.dataWaitList.get(key).push(latePromise)

            setTimeout(() => {
                if(this.dataWaitList.has(key)) {
                    this.dataWaitList.get(key).forEach((checkPromise, index) => {
                        if(checkPromise.uuid.localeCompare(latePromise.uuid) == 0) {
                            checkPromise.resolve(null);
                            this.dataWaitList.get(key).slice(index)
                        }
                    });
                }
            }, 5000)
        })

        connection.send(JSON.stringify({
            type: event,
            data: {

            }
        }))

        return promise
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
}

export { APIServer };