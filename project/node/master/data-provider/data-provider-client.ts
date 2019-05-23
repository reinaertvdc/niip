import WebSocket from "ws";

class DataProviderClient {
    // Hosts in string form
    private dataProviderIP: string;
    private endPoint: string;

    private buffer = null;
    private intervalUUID: string = null;
    private authenticationID: number = 89684413261313;
    private authenticationKey: string = "X4CkHVsySCMZImzm5I/+Z0miXiq3YWidhl4gbkU4V+k=";
    private authenticated: boolean = false;

    private dataSocket;
    private dataEventMap: Map<string, Function> = new Map();
    private dataSocketInterval = null;
    private dataSocketPing = null;

    private dataList: Array<any>;
    private requestedData: Array<any>;
    private requestedInterval: number;

    private endPointSocket;
    private endPointEventMap: Map<string, Function> = new Map();
    private endPointSocketInterval = null;
    
    constructor(dataProviderIP, endPoint) {
        this.dataProviderIP = dataProviderIP;
        this.endPoint = endPoint;

        this.initEventMaps();
        this.initSockets();
    }

    /**
     * Initialises the event maps, these maps link socket events to functions
     */
    private initEventMaps() {
        this.onListData = this.onListData.bind(this);
        this.dataEventMap.set("list-data", this.onListData);
        this.onStartDataStream = this.onStartDataStream.bind(this);
        this.dataEventMap.set("start-data-stream", this.onStartDataStream);
        this.onDataStreamTick = this.onDataStreamTick.bind(this);
        this.dataEventMap.set("data-stream-tick", this.onDataStreamTick);
        this.onStopDataStream = this.onStopDataStream.bind(this);
        this.dataEventMap.set("stop-data-stream", this.onStopDataStream);

        this.onRequestData = this.onRequestData.bind(this);
        this.endPointEventMap.set("request-data", this.onRequestData);
    }

    private initSockets() {
        this.initDataSocket();
        this.initEndPointSocket();
    }

    private initDataSocket() {
        this.dataSocket = new WebSocket(this.dataProviderIP);
        this.dataSocket.connected = false;

        this.dataSocket.on("message", (data) => {
            console.log("[ConnectivityManager] Data Message: " + data);
            this.onDataMessage(data);
        });

        this.dataSocket.on("open", () => {
            console.log("[ConnectivityManager] DataSocket opened on " + this.dataProviderIP);
            this.onDataConnection();
        });

        this.dataSocket.on("error", (error) => {
            this.onDataConnectionError(null, error);
        });

        this.intervalUUID = null;
    }

    private initEndPointSocket() {
        this.endPointSocket = new WebSocket(this.endPoint);
        this.endPointSocket.connected = false;
        this.authenticated = false;

        this.endPointSocket.on("message", (data) => {
            this.onEndPointMessage(data);
        })
        
        this.endPointSocket.on("open", () => {
            console.log("[ConnectivityManager] EndPointSocket opened on " + this.endPoint);
            this.onEndPointConnection();
        });

        this.endPointSocket.on("error", (error) => {
            this.onEndPointConnectionError(null, error);
        });
    }

    /**
     * Wrapper for sending data on the dataSocket
     * @param object Object to send to the data server, will be stringified
     */
    private sendOnDataConnection(object) {
        console.log("[ConnectivityManager] Data send: " + JSON.stringify(object));

        this.dataSocket.send(JSON.stringify(object), (error) => {
            if(error) {
                this.onDataConnectionError(object, error);
            }
        });
    }

    /**
     *  Wrapper for sending data on the endPointSocket
     * @param object Object to send to the end point, will be stringified.
     */
    private sendOnEndPointConnection(object) {
        console.log("[ConnectivityManager] Endpoint send: " + JSON.stringify(object));

        this.endPointSocket.send(JSON.stringify(object), (error) => {
            if(error) {
                this.onEndPointConnectionError(object, error);
            }
        });
    }

    /**
     * Function that is called when a connection to the Data Server has been established
     */
    private onDataConnection() {
        // Check if there is a reconnect interval running
        if(this.dataSocketInterval != null) {
            // If so, stop the interval, we have a connection
            clearInterval(this.dataSocketInterval);
            this.dataSocketInterval = null;
        }
        this.dataSocket.connected = true;

        // Ask for a list of available data
        this.sendOnDataConnection({
            "type": "list-data",
            "data": {
            }
        });

        // Start a ping interval so we can detect when the socket is dead
        this.dataSocketPing = setInterval(() => {
            this.sendOnDataConnection({});
        }, 10000);

        // If data was request by the root server, restart a data stream
        if(this.requestedData) {
            this.startStream();
        }
    }

    /**
     * Function that gets called when a connection to the end point server has been established.
     */
    private onEndPointConnection() {
        // Check if there is a reconnect interval running
        if(this.endPointSocketInterval != null) {
            // If so, stop the interval since we have a connection
            clearInterval(this.endPointSocketInterval);
            this.endPointSocketInterval = null;
        }
        this.endPointSocket.connected = true;

        // In order to use this socket we need to authenticate first
        this.sendOnEndPointConnection({
            "type": "authenticate",
            "data": {
                "id": this.authenticationID,
                "key": this.authenticationKey
            }
        });

        // Send the buffer if there is one
        this.sendBuffer();
    }

    /**
     * Function that gets called when we receive a message from the data server.
     * @param data The received message from the data server.
     */
    private onDataMessage(data) {
        // We operate in JSON so parse the message as JSON
        data = JSON.parse(data);

        // Check if the JSON object has the correct structure
        if(data.hasOwnProperty("type") && data.hasOwnProperty("data")) {
            // Check if we can handle the event
            if(this.dataEventMap.has(data.type)) {
                // Call the event
                this.dataEventMap.get(data.type)(data.data);
            }
        }
    }

    /**
     * This function is a callback for when we receive a "list-data" event on the dataSocket.
     * @param data The payload from the "list-data" event.
     */
    private onListData(data) {
        // Check if the payload has the correct structure
        if(data.hasOwnProperty("sources")) {
            // Extract the sources
            this.dataList = data.sources;
            this.dataList.forEach((value, index) => {
                console.log(value);
            });
        }
    }

    /**
     * This function is a callback for when we receive a "start-data-stream" event on the dataSocket.
     * @param data The payload from the "start-data-stream" event.
     */
    private onStartDataStream(data) {
        // Check if the payload has the correct structure
        if(data.hasOwnProperty("uuid")) {
            // Extract the UUID, we need this to stop the stream later if we want to.
            console.log("UUID: " + data.uuid);
            this.intervalUUID = data.uuid;
        }
    }

    /**
     * This function is a callback for when we receive a "data-stream-tick" event on the dataSocket.
     * @param data The payload from the "data-stream-tick" event.
     */
    private onDataStreamTick(data) {
        // Check if the payload has the correct structure.
        if(data.hasOwnProperty("uuid")) {
            // Check if it is the right stream
            if(data.uuid == this.intervalUUID) {
                // Delete the UUID for the data, we don't need it anymore
                delete data.uuid;
                // Send the data to the root server
                this.sendAnalytics(data);
            }
        }
    }

    /**
     * This function is a callback for when we receive a "stop-data-stream" event on the dataSocket.
     * @param data The payload from the "stop-data-stream" event.
     */
    private onStopDataStream(data) {
        // Check if the payload has the correct structure
        if(data.hasOwnProperty("success")) {
            // Check if the cancellation was successfull.
            if(data.success) {
                // Clear the UUID
                this.intervalUUID = null;
            }
        }
    }

    /**
     * This function is a callback for when we receive a message from the endPointSocket.
     * @param data The message in string format
     */
    private onEndPointMessage(data) {
        console.log("[ConnectivityManager] Endpoint Message: " + data);
        // We operate using JSON so parse the string as JSON
        data = JSON.parse(data);

        // Check if the JSON object has the correct structure
        if(data.hasOwnProperty("type") && data.hasOwnProperty("data")) {
            // Check if we support this event
            if(this.endPointEventMap.has(data.type)) {
                // If so, call the event handler
                this.endPointEventMap.get(data.type)(data.data);
            }
        }
    }

    /**
     * This function is a callback for the "request-data" event on the endPointSocket
     * @param data The payload from the "request-data" event 
     */
    private onRequestData(data) {
        // Check if the payload has the correct structure
        if(data.hasOwnProperty("sources") && data.hasOwnProperty("interval")) {
            // Extract the wanted data and the interval 
            //this.requestedData = data.sources;
            this.requestedData = ["pid-12"];  // Use this if you want to fetch PID data instead of server requested data
            this.requestedInterval = data.interval;
            // This message should be the first response from the server so we know we are authenticated if we receive this
            this.authenticated = true;

            // Request the data from the data server.
            this.requestData();
        }
    }

    /**
     * This function is a callback for when an error has occured on the dataSocket
     * @param message The message that caused an error on send, can be null
     * @param error The error on the connection
     */
    private onDataConnectionError(message, error) {
        // Check if we have a reconnect interval running, if not, start one.
        if(this.dataSocketInterval == null) {
            // Clear the current socket.
            console.log("[ConnectivityManager] Error on data socket, closing.");
            this.dataSocket.connected = false;
            this.dataSocket.terminate();

            // If we have a ping interval running we need to stop it or else it will cause more errors
            if(this.dataSocketPing) {
                clearInterval(this.dataSocketPing);
                this.dataSocketPing = null;
            }

            // Start the reconnect interval.
            this.dataSocketInterval = setInterval(() => {
                console.log("[ConnectivityManager] Trying to connect to data source.");
                this.initDataSocket();
            }, 10000);
        }
    }

    /**
     * This function is a callback for when an error has occured on the endPointSocket
     * @param message The message that caused an error on send, can be null
     * @param error The error on the connection
     */
    private onEndPointConnectionError(message, error) {
        // If the message that caused an error is an analytics message
        // We need to store the message in our buffer, otherwise we lose data.
        if(message != null && message.type == "analytics") {
            this.writeToBuffer(message.data);
        }

        // Check if we have a reconnect interval running, if not start one
        if(this.endPointSocketInterval == null) {
            console.log("[ConnectivityManager] Error on endpoint socket, closing.");
            // Clear the current socket.
            this.endPointSocket.connected = false;
            this.endPointSocket.terminate();

            // Start the reconnect interval
            this.endPointSocketInterval = setInterval(() => {
                console.log("[ConnectivityManager] Trying to connect to endpoint.");
                this.initEndPointSocket();
            }, 10000);
        }
    }

    private isDataConnected() {
        return this.dataSocket.connected;
    }

    private isEndPointConnected() {
        return this.endPointSocket.connected && this.authenticated;
    }

    /**
     * Function that starts a data stream on the dataSocket using the requested data and interval provided by the root server
     */
    private startStream() {
        this.sendOnDataConnection({
            "type": "start-data-stream",
            "data": {
                "sources": this.requestedData,
                "interval": this.requestedInterval
            }
        });
    }

    /**
     * Function that stops the data stream.
     */
    private stopStream() {
        this.sendOnDataConnection({
            "type": "stop-data-stream",
            "data": {
                "uuid": this.intervalUUID
            }
        });

        this.intervalUUID = null;
    }

    /**
     * Function that checks if we have a running stream and stops it before starting a new stream.
     */
    private requestData() {
        if(this.intervalUUID != null) {
            this.stopStream();
        }
        this.startStream();
    }

    /**
     * Function that sends data to the endpoint server if we can, otherwise it gets stored in the buffer
     * @param data The data we need to send to the end point server
     */
    private sendAnalytics(data) {
        // Transform values to a value array for consistency
        this.transformValuesToArray(data);

        // If we are connected send the data now
        if(this.isEndPointConnected()) {
            this.sendOnEndPointConnection({
                "type": "analytics",
                "data": data
            });
        }
        // Otherwise buffer it
        else {
            this.writeToBuffer(data);
        }
    }

    /**
     * This function merges the given data with other stored data based on their key.
     * @param data Data to put in our buffer
     */
    private writeToBuffer(data) {
        // If our buffer is empty, just put the first object as buffer
        if(this.buffer == null) {
            this.buffer = data;
        }
        // Else we need to merge the data
        else {
            var keys = Object.keys(data);

            // Merge the values of each key
            keys.forEach((key) => {
                if(this.buffer.hasOwnProperty(key)) {
                    this.buffer[key] = [...this.buffer[key], ...data[key]];
                }
            });
        }
    }

    /**
     * Send the buffer to the server and clear it.
     */
    private sendBuffer() {
        this.sendOnEndPointConnection({
            "type": "analytics",
            "data": this.buffer
        });

        this.buffer = null;
    }

    /**
     * 
     * @param data Functions that transforms a key: value object to key: [value] object.
     */
    private transformValuesToArray(data) {
        var keys = Object.keys(data);

        keys.forEach((key) => {
            data[key] = [data[key]];
        });
    }
}

export { DataProviderClient };