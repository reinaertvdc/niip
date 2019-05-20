import {Client, connect, IClientOptions, QoS, ISubscriptionGrant, Packet} from 'mqtt';
import { EventEmitter } from 'events';
import {sleep} from './sleep-util';

export {IClientOptions, QoS};

EventEmitter.defaultMaxListeners = 0;

export class MQTT extends EventEmitter {

    private _url: string;
    private _options: IClientOptions;
    private _client: Client|null = null;
    private _connecting: boolean = false;
    private _topics: Array<{topic:string,qos:QoS,callback:(topic:string,payload:Buffer)=>void|Promise<void>}> = [];

    public constructor(url: string, options: IClientOptions = {}) {
        super();
        this._url = url;
        this._options = options;
    }

    private clientListener(): void {
        if (this._client !== null && this._client !== undefined) {
            this._client.removeListener('error', this.clientListener);
            this._client.removeListener('end', this.clientListener);
            this._client.removeListener('offline', this.clientListener);
            this._client.removeListener('close', this.clientListener);
            this.disconnect();
        }
    }

    private async messageListener(topic: string, payload: Buffer, packet: Packet): Promise<void> {
        // console.log('MESSAGE START');
        // console.log(topic);
        // console.log(payload);
        // console.log(packet);
        // console.log('MESSAGE END');
        for (let i: number = 0; i < this._topics.length; i++) {
            if (this._topics[i].topic === topic) {
                this._topics[i].callback(topic, payload);
                return;
            }
        }
    }

    private async innerConnect(timeout: number = 30000): Promise<boolean> {
        const that = this;
        return new Promise<boolean>((resolve,reject)=>{
            if ((that._client !== null && that._client !== undefined) || that._connecting) {
                while (that._connecting) {
                    sleep(50);
                }
                if (that._client !== null && that._client.connected) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
                return;
            }
            let errored: boolean = false;
            that._connecting = true;
            const tmpcb = function() {
                errored = true;
            }
            let tmptimeout: NodeJS.Timeout = setTimeout(tmpcb, timeout);
            that._client = connect(this._url, this._options);
            that._client.on('error', tmpcb);
            that._client.on('end', tmpcb);
            that._client.on('offline', tmpcb);
            that._client.on('close', tmpcb);
            const connectwait = function() {
                if (that._client === null || that._client === undefined) {
                    clearTimeout(tmptimeout);
                    that._connecting = false;
                    resolve(false);
                }
                else if (errored) {
                    clearTimeout(tmptimeout);
                    that._client.removeListener('error', tmpcb);
                    that._client.removeListener('end', tmpcb);
                    that._client.removeListener('offline', tmpcb);
                    that._client.removeListener('close', tmpcb);
                    that._connecting = false
                    that.disconnect().then((val)=>{
                        resolve(false);
                    });
                }
                else if (!that._client.connected) {
                    setTimeout(() => {
                        connectwait();
                    }, 50);
                }
                else {
                    clearTimeout(tmptimeout);
                    that._client.removeListener('error', tmpcb);
                    that._client.removeListener('end', tmpcb);
                    that._client.removeListener('offline', tmpcb);
                    that._client.removeListener('close', tmpcb);
                    that._client.on('error', that.clientListener);
                    that._client.on('end', that.clientListener);
                    that._client.on('offline', that.clientListener);
                    that._client.on('close', that.clientListener);
                    that._connecting = false;
                    that._client.on('message', that.messageListener.bind(that));
                    resolve(true);
                }
            }
            connectwait();
        });
    }

    public async connect(): Promise<boolean> {
        let oldConnected: boolean = (this._client !== null && !this._connecting && this._client.connected);
        let connected: boolean = await this.innerConnect();
        if (connected) {
            if (!oldConnected) {
                let p: Array<Promise<boolean>> = [];
                for (let i: number = 0; i < this._topics.length; i++) {
                    let topic = this._topics[i];
                    p.push(this.innerSubscribe(topic.topic, topic.qos));
                }
                await Promise.all(p);
            }
            this.emit('connect');
        }
        return connected;
    }

    //TODO: move part of actual disconnect call to seperate private function
    public async disconnect(): Promise<void> {
        while (this._connecting) {
            await sleep(50);
        }
        if (this._client === null || this._client === undefined) { return; }
        const that = this;
        await new Promise<void>((resolve,reject)=>{
            let errored: boolean = false;
            const tmpcb = function() {
                errored = true;
                if (that._client !== null) {
                    that._client.removeListener('error', tmpcb);
                    that._client.removeListener('end', tmpcb);
                    that._client.removeListener('offline', tmpcb);
                    that._client.removeListener('close', tmpcb);
                    that._client.removeAllListeners('message');
                    that._client = null;
                }
                that.emit('disconnect');
                resolve();
            }
            if (that._client !== null) {
                that._client.removeListener('error', that.clientListener);
                that._client.removeListener('end', that.clientListener);
                that._client.removeListener('offline', that.clientListener);
                that._client.removeListener('close', that.clientListener);
                that._client.on('error', tmpcb);
                that._client.on('end', tmpcb);
                that._client.on('offline', tmpcb);
                that._client.on('close', tmpcb);
            }
            else {
                this.emit('disconnect');
                resolve();
                return;
            }
            let tmptimeout: NodeJS.Timeout = setTimeout(tmpcb, 30000);
            that._client.end(true, ()=>{
                clearTimeout(tmptimeout);
                if (!errored) {
                    if (that._client !== null) {
                        that._client.removeListener('error', tmpcb);
                        that._client.removeListener('end', tmpcb);
                        that._client.removeListener('offline', tmpcb);
                        that._client.removeListener('close', tmpcb);
                        that._client = null;
                    }
                    this.emit('disconnect');
                    resolve();
                }
            });
        });
    }

    private async innerSubscribe(topic: string, qos: QoS = 0, timeout: number = 30000): Promise<boolean> {
        const that = this;
        return new Promise<boolean>((resolve,reject)=>{
            if (that._client === null || that._client === undefined || that._connecting) {
                resolve(false);
                return;
            }
            let errored: boolean = false;
            const tmpcb = function() {
                errored = true;
                if (that._client !== null) {
                    that._client.removeListener('error', tmpcb);
                    that._client.removeListener('end', tmpcb);
                    that._client.removeListener('offline', tmpcb);
                    that._client.removeListener('close', tmpcb);
                }
                resolve(false);
            }
            that._client.on('error', tmpcb);
            that._client.on('end', tmpcb);
            that._client.on('offline', tmpcb);
            that._client.on('close', tmpcb);
            let tmptimeout: NodeJS.Timeout = setTimeout(tmpcb, timeout);
            that._client.subscribe(topic, {qos: qos}, (err: Error, granted: Array<ISubscriptionGrant>)=>{
                clearTimeout(tmptimeout);
                if (errored) { return; }
                if (that._client !== null) {
                    that._client.removeListener('error', tmpcb);
                    that._client.removeListener('end', tmpcb);
                    that._client.removeListener('offline', tmpcb);
                    that._client.removeListener('close', tmpcb);
                }
                if (err === null || err === undefined) {
                    for (let i: number = 0; i < granted.length; i++) {
                        if (granted[i].topic === topic) {
                            that.emit('subscribe');
                            resolve(true);
                            return;
                        }
                    }
                    resolve(false);
                }
                else {
                    resolve(false);
                }
            });
        });
    }

    public async subscribe(topic: string, qos: QoS = 0, callback: (topic:string,payload:Buffer)=>void|Promise<void>): Promise<boolean> {
        for (let i: number = 0; i < this._topics.length; i++) {
            if (this._topics[i].topic === topic) { return true; }
        }
        if (this._client === null || this._client === undefined || this._connecting) {
            this._topics.push({topic:topic,qos:qos,callback:callback});
            return false;
        }
        let subSuccess: boolean = await this.innerSubscribe(topic, qos);
        if (!subSuccess) {
            return false;
        }
        this._topics.push({topic:topic,qos:qos,callback:callback});
        return true;
    }

    private async innerPublish(topic: string, message: string|Buffer, qos: QoS = 0, retain: boolean = false, dup: boolean = false, timeout: number = 30000): Promise<boolean> {
        const that = this;
        return new Promise<boolean>((resolve,reject)=>{
            if (that._client === null || that._client === undefined || that._connecting) {
                resolve(false);
                return;
            }
            let errored: boolean = false;
            const tmpcb = function() {
                errored = true;
                if (that._client !== null) {
                    that._client.removeListener('error', tmpcb);
                    that._client.removeListener('end', tmpcb);
                    that._client.removeListener('offline', tmpcb);
                    that._client.removeListener('close', tmpcb);
                    that.disconnect();
                }
                resolve(false);
            }
            that._client.on('error', tmpcb);
            that._client.on('end', tmpcb);
            that._client.on('offline', tmpcb);
            that._client.on('close', tmpcb);
            let tmptimeout: NodeJS.Timeout = setTimeout(tmpcb, timeout);
            that._client.publish(topic, message, {qos: qos, retain: retain, dup: dup}, (error: Error|undefined, packet: Packet|undefined)=>{
                clearTimeout(tmptimeout);
                if (errored) { return; }
                if (that._client !== null) {
                    that._client.removeListener('error', tmpcb);
                    that._client.removeListener('end', tmpcb);
                    that._client.removeListener('offline', tmpcb);
                    that._client.removeListener('close', tmpcb);
                }
                if (error === null || error === undefined) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            });
        });
    }

    public async publish(topic: string, message: string|Buffer, qos: QoS, retain: boolean = false, dup: boolean = false): Promise<boolean> {
        if (this._client === null || this._client === undefined) {
            if (!await this.connect()) {
                return false;
            }
        }
        if (this._client === null || this._client === undefined || this._connecting) {
            return false;
        }
        return await this.innerPublish(topic, message, qos, retain, dup, 30000);

    }

    public async publishAll(topic: string, messages: Array<string|Buffer>, qos: QoS, retain: boolean = false, dup: boolean = false): Promise<Array<boolean>> {
        let p: Array<Promise<boolean>> = [];
        for (let i: number = 0; i < messages.length; i++) {
            p.push(this.publish(topic, messages[i], qos, retain, dup));
        }
        return await Promise.all(p);
    }

}


// EXAMPLE CODE BELOW
// async function test(): Promise<void> {
//     let c: MQTT = new MQTT('mqtts://mqtt.logitrack.tk', {
//         username: 'cwout',
//         clientId: 'cwout',
//         password: 'test123',
//         clean: false,
//     });
//     console.log('CONNECT');
//     console.log(await c.connect());
//     console.log('PUBLISH');
//     console.log(await c.publish('0/data', 'test123456', 2, true));
//     console.log('SUBSCRIBE');
//     console.log(await c.subscribe('#'));
//     console.log('DISCONNECT');
//     console.log(await c.disconnect());
// }
// test();
