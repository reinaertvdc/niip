import * as WebSocket from "ws";

class ConnectivityManager {
    private dataProviderIP: string;
    private endPoint: string;

    private buffer = null;
    private intervalUUID: string = null;
    private authenticationKey: string = "GyTTuT27ZTtKdQ85kGQ346jZyDe2WTqWTj4/AajYlmM=";
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

    private sendOnDataConnection(object) {
        console.log("Send Data: " + JSON.stringify(object));
        this.dataSocket.send(JSON.stringify(object), (error) => {
            if(error) {
                this.onDataConnectionError(object, error);
            }
        });
    }

    private sendOnEndPointConnection(object) {
        console.log("[ConnectivityManager] Endpoint send: " + JSON.stringify(object));

        this.endPointSocket.send(JSON.stringify(object), (error) => {
            if(error) {
                this.onEndPointConnectionError(object, error);
            }
        });
    }

    private onDataConnection() {
        if(this.dataSocketInterval != null) {
            clearInterval(this.dataSocketInterval);
            this.dataSocketInterval = null;
        }
        this.dataSocket.connected = true;

        this.sendOnDataConnection({
            "type": "list-data",
            "data": {
            }
        });

        this.dataSocketPing = setInterval(() => {
            this.sendOnDataConnection({});
        }, 10000);

        if(this.requestedData) {
            this.startStream();
        }
    }

    private onEndPointConnection() {
        if(this.endPointSocketInterval != null) {
            clearInterval(this.endPointSocketInterval);
            this.endPointSocketInterval = null;
        }
        this.endPointSocket.connected = true;

        this.sendOnEndPointConnection({
            "type": "authenticate",
            "data": {
                "key": this.authenticationKey
            }
        });

        this.sendBuffer();
    }

    private onDataMessage(data) {
        data = JSON.parse(data);

        if(data.hasOwnProperty("type") && data.hasOwnProperty("data")) {
            if(this.dataEventMap.has(data.type)) {
                this.dataEventMap.get(data.type)(data.data);
            }
        }
    }

    private onListData(data) {
        if(data.hasOwnProperty("sources")) {
            this.dataList = data.sources;
            this.dataList.forEach((value, index) => {
                console.log(value);
            });
        }
    }

    private onStartDataStream(data) {
        if(data.hasOwnProperty("uuid")) {
            console.log("UUID: " + data.uuid);
            this.intervalUUID = data.uuid;
        }
    }

    private onDataStreamTick(data) {
        if(data.hasOwnProperty("uuid")) {
            // We know for sure it's the right interval
            if(data.uuid == this.intervalUUID) {
                delete data.uuid;
                this.sendAnalytics(data);
            }
        }
    }

    private onStopDataStream(data) {
        if(data.hasOwnProperty("success")) {
            if(data.success) {
                this.intervalUUID = null;
            }
        }
    }

    private onEndPointMessage(data) {
        console.log("[ConnectivityManager] Endpoint Message: " + data);
        data = JSON.parse(data);

        if(data.hasOwnProperty("type") && data.hasOwnProperty("data")) {
            if(this.endPointEventMap.has(data.type)) {
                this.endPointEventMap.get(data.type)(data.data);
            }
        }
    }

    private onRequestData(data) {
        if(data.hasOwnProperty("sources") && data.hasOwnProperty("interval")) {
            this.requestedData = data.sources;
            this.requestedInterval = data.interval;
            this.authenticated = true;

            this.requestData();
        }
    }

    private onDataConnectionError(message, error) {
        if(this.dataSocketInterval == null) {
            console.log("[ConnectivityManager] Error on data socket, closing.");
            this.dataSocket.connected = false;
            this.dataSocket.terminate();

            if(this.dataSocketPing) {
                clearInterval(this.dataSocketPing);
                this.dataSocketPing = null;
            }

            this.dataSocketInterval = setInterval(() => {
                console.log("[ConnectivityManager] Trying to connect to data source.");
                this.initDataSocket();
            }, 10000);
        }
    }

    private onEndPointConnectionError(message, error) {
        if(message != null && message.type == "analytics") {
            this.writeToBuffer(message.data);
        }

        if(this.endPointSocketInterval == null) {
            console.log("[ConnectivityManager] Error on endpoint socket, closing.");
            this.endPointSocket.connected = false;
            this.endPointSocket.terminate();

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

    private startStream() {
        this.sendOnDataConnection({
            "type": "start-data-stream",
            "data": {
                "sources": this.requestedData,
                "interval": this.requestedInterval
            }
        });
    }

    private stopStream() {
        this.sendOnDataConnection({
            "type": "stop-data-stream",
            "data": {
                "uuid": this.intervalUUID
            }
        });

        this.intervalUUID = null;
    }

    private requestData() {
        if(this.intervalUUID != null) {
            this.stopStream();
        }
        this.startStream();
    }

    private sendAnalytics(data) {
        this.transformValuesToArray(data);

        if(this.isEndPointConnected()) {
            
            this.sendOnEndPointConnection({
                "type": "analytics",
                "data": data
            });
        }
        else {
            this.writeToBuffer(data);
        }
    }

    private writeToBuffer(data) {
        if(this.buffer == null) {
            this.buffer = data;
        }
        else {
            var keys = Object.keys(data);

            keys.forEach((key) => {
                if(this.buffer.hasOwnProperty(key)) {
                    this.buffer[key] = [...this.buffer[key], ...data[key]];
                }
            });
        }
    }

    private sendBuffer() {
        this.sendOnEndPointConnection({
            "type": "analytics",
            "data": this.buffer
        });

        this.buffer = null;
    }

    private transformValuesToArray(data) {
        var keys = Object.keys(data);

        keys.forEach((key) => {
            data[key] = [data[key]];
        });
    }
}

export { ConnectivityManager };