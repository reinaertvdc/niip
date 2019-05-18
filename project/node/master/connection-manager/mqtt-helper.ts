#!/usr/bin/env ts-node

import {Client, connect, IClientOptions, QoS, ISubscriptionGrant} from 'mqtt';
import { EventEmitter } from 'events';
import {sleep} from './sleep-util';
import { resolve } from 'dns';

export {IClientOptions, QoS};

export class MQTT extends EventEmitter {

    private _url: string;
    private _options: IClientOptions;
    private _client: Client|null = null;
    private _connecting: boolean = false;
    private _topics: Array<{topic:string,qos:QoS}> = [];

    public constructor(url: string, options: IClientOptions = {}) {
        super();
        this._url = url;
        this._options = options;
    }

    public async connect(): Promise<boolean> {
        this._connecting = true;
        const that = this;
        try {
            await new Promise<void>((resolve,reject)=>{
                let errored = false;
                const tmpcb = function() {
                    errored = true;
                }
                that._client = connect(this._url, this._options);
                that._client.on('error', tmpcb);
                that._client.on('end', tmpcb);
                that._client.on('offline', tmpcb);
                that._client.on('close', tmpcb);
                const connectwait = function() {
                    if (that._client === null) {
                        reject();
                    }
                    else if (errored) {
                        that._client.removeListener('error', tmpcb);
                        that._client.removeListener('end', tmpcb);
                        that._client.removeListener('offline', tmpcb);
                        that._client.removeListener('close', tmpcb);
                        that._client.end(true, ()=>{
                            that._client = null;
                            reject();
                        });
                    }
                    else if (!that._client.connected) {
                        setTimeout(() => {
                            connectwait();
                        }, 100);
                    }
                    else {
                        that._client.removeListener('error', tmpcb);
                        that._client.removeListener('end', tmpcb);
                        that._client.removeListener('offline', tmpcb);
                        that._client.removeListener('close', tmpcb);
                        resolve();
                    }
                }
                connectwait();
            });
        } catch (e) {
            this._connecting = false;
            return false;
        }
        this.emit('connect');
        this._connecting = false;
        for (let i: number = this._topics.length-1; i >= 0; i--) {
            if (!await this.innerSubscribe(this._topics[i].topic, this._topics[i].qos)) {
                this._topics.splice(i,1);
            };
        }
        return true;
    }

    public async disconnect(): Promise<void> {
        while (this._connecting) {
            await sleep(50);
        }
        if (this._client === null) { return; }
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
                    that._client = null;
                }
                that.emit('disconnect');
                resolve();
            }
            if (that._client !== null) {
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
            that._client.end(true, ()=>{
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

    private async innerSubscribe(topic: string, qos: QoS = 0): Promise<boolean> {
        const that = this;
        return new Promise<boolean>((resolve,reject)=>{
            if (that._client === null || that._connecting) {
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
            that._client.subscribe(topic, {qos: qos}, (err: Error, granted: Array<ISubscriptionGrant>)=>{
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
                            break;
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

    public async subscribe(topic: string, qos: QoS = 0): Promise<boolean> {
        for (let i: number = 0; i < this._topics.length; i++) {
            if (this._topics[i].topic === topic) { return true; }
        }
        if (this._client === null || this._connecting) {
            this._topics.push({topic:topic,qos:qos});
            return false;
        }
        let subSuccess: boolean = await this.innerSubscribe(topic, qos);
        if (!subSuccess) {
            return false;
        }
        this._topics.push({topic:topic,qos:qos});
        return true;
    }

    public async publish(topic: string, message: string, qos: QoS): Promise<void> {
        
        //TODO
    }

}

async function test(): Promise<void> {
    let c: MQTT = new MQTT('mqtts://mqtt.logitrack.tk', {
        username: 'cwout',
        clientId: 'cwout',
        password: 'test123',
        clean: false,
    });
    console.log('CONNECT');
    console.log(await c.connect());
    console.log(await c.subscribe('#'));
    console.log(await c.disconnect());
}
test();
