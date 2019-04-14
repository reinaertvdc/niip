#!/usr/bin/env node

var wifi = require('node-wifi');
wifi.init({iface:null});

const assert = require('assert');

const WebSocket = require('ws');


class AP {
    constructor(ssid, psk, cost, speed) {
        this._ssid = ssid;
        this._psk = psk;
        this._cost = cost;
        this._speed = speed;
    }
    get ssid() {
        return this._ssid;
    }
    get psk() {
        return this._psk;
    }
    get cost() {
        return this._cost;
    }
    get speed() {
        return this._speed;
    }
    set cost(cost) {}
    //TODO: set cost !!!
    set psk(psk) {}
    //TODO: set psk
    set speed(speed) {}
    //TODO: set speed
}

class ByteBuffer {
    constructor(size = 1024) {
        this._baseSize = size;
        this._size = 0;
        this._bytes = Buffer.allocUnsafe(this._baseSize);
    }
    get length() {
        return this._size;
    }
    get bytes() {
        return this._bytes;
    }
    set bytes(bytes = []) {
        if (bytes instanceof Buffer) {
            if (bytes.length > this._bytes.length) {
                this._bytes = Buffer.allocUnsafe(bytes.length);
            }
            bytes.copy(this._bytes);
            this._size = bytes.length;
        }
        else if (bytes instanceof Array) {
            if (bytes.length > this._bytes.length) {
                this._bytes = Buffer.allocUnsafe(bytes.length);
            }
            for (i = 0; i < bytes.length; i++) {
                this._bytes[i] = bytes[i];
            }
            this._size = bytes.length;
        }
        else if (bytes instanceof String) {
            if (bytes.length > this._bytes.length) {
                this._bytes = Buffer.from(bytes);
            }
            else {
                for (i = 0; i < bytes.length; i++) {
                    this._bytes[i] = bytes.charCodeAt(i);
                }
            }
            this._size = bytes.length;
        }
        else {
            this._size = 0;
        }
    }
    resetToBaseSize(factor = 1) {
        if (this._bytes.length > this._baseSize * 4) {
            this._bytes = Buffer.allocUnsafe(this._baseSize);
        }
    }
}

class ByteBufferPool {
    constructor(baseCount = 1024, baseSize = 1024, maxCountFactor = 4, baseSizeResetFactor = 4) {
        this._baseSize = baseSize;
        this._resetFactor = baseSizeResetFactor;
        this._maxCount = baseCount * maxCountFactor;
        this._pool = [];
        for (let i = 0; i < baseCount; i++) {
            this._pool.push(new ByteBuffer(baseSize));
        }
    }
    getBuffer() {
        if (this._pool.length == 0) {
            return new ByteBuffer(this._baseSize);
        }
        else {
            buffer = this._pool.pop();
            return this.buffer;
        }
    }
    addBuffer(buffer) {
        assert(buffer instanceof ByteBuffer);
        if (this._pool.length >= this._maxCount) { return; }
        buffer.resetToBaseSize(this._resetFactor);
        this._pool.push(buffer);
    }
}

class Data {
    constructor(byteBuffer, urgency) {
        assert(byteBuffer instanceof ByteBuffer);
        this._buffer = byteBuffer;
        this._urgency = urgency;
    }
    get buffer() {
        return this._buffer;
    }
    get urgency() {
        return this._urgency;
    }
}
Data.URGENCY_SEND_ALWAYS_FIRST = 0;
Data.URGENCY_SEND_ALWAYS = Data.URGENCY_SEND_ALWAYS_FIRST + 1;
Data.URGENCY_SEND_NOCOST = Data.URGENCY_SEND_ALWAYS + 1;
Data.URGENCY_SEND_NOCOST_WHENEVER = Data.URGENCY_SEND_NOCOST + 1;

class Router {
    constructor(wifiCheckInterval = 15000, minQuality = 40) {
        this._connectInterval = wifiCheckInterval;
        this._minQuality = minQuality;
        this._pool = new ByteBufferPool();
        this._sendBufferAlwaysFirst = [];
        this._sendBufferAlways = [];
        this._sendBufferNocost = [];
        this._sendBufferNocostWhenever = [];
        this._aps = [];
        try {
            this._ws = new WebSocket('ws://127.0.0.1:8080');
        } catch(ignored) {}

        setTimeout(this._connectLoop.bind(this), 0);
        // setTimeout(this._sendLoop.bind(this), 0);
    }
    get pool() {
        return this._pool;
    }
    send(data) {
        assert(data instanceof Data);
        if (data.urgency === Data.URGENCY_SEND_ALWAYS_FIRST) {
            this._sendBufferAlwaysFirst.push(data);
        }
        else if (data.urgency === Data.URGENCY_SEND_ALWAYS) {
            this._sendBufferAlways.push(data);
        }
        else if (data.urgency === Data.URGENCY_SEND_NOCOST) {
            this._sendBufferNocost.push(data);
        }
        else if (data.urgency === Data.URGENCY_SEND_NOCOST_WHENEVER) {
            this._sendBufferNocostWhenever.push(data);
        }
    }
    addAP(ap) {
        assert(ap instanceof AP);
        this._aps.push(ap);
    }
    _connectLoop() {
        console.log('Connect loop iteration');
        console.log('Scanning');
        wifi.scan((err, nets) => {
            console.log('Scan completed');
            if (err) {
                console.error(err);
                setTimeout(this._connectLoop.bind(this), this._connectInterval);
                return;
            }
            console.log('No errors');
            console.log(nets.length + ' networks found');
            let bestFreeNet = undefined;
            let bestFreeAP = undefined;
            let bestPaidNet = undefined;
            let bestPaidAP = undefined;
            for (let i = 0; i < nets.length; i++) {
                let net = nets[i];
                for (let j = 0; j < this._aps.length; j++) {
                    let ap = this._aps[j];
                    if (net.ssid == ap.ssid) {
                        let free = (ap.cost === 0);
                        let cmpWith = free ? bestFreeAP : bestPaidAP;
                        let cmpWithNet = free ? bestFreeNet : bestPaidNet;
                        let isBetter = false;
                        let qd = (net === undefined || cmpWithNet === undefined ? 0 : net.quality - cmpWithNet.quality);
                        let sf = (ap === undefined || cmpWith === undefined ? 1 : ap.speed / cmpWith.speed);
                        if (cmpWith === undefined || cmpWithNet === undefined) isBetter = true;
                        else if (qd > 0) {
                            if (cmpWithNet.quality < minQuality) {
                                isBetter = true;
                            }
                            else if (sf >= 1) {
                                isBetter = true;
                            }
                            else if (qd / 10 < 2 * sf) {
                                isBetter = true;
                            }
                        }
                        else if (sf > 1) {
                            if (qd >= this._minQuality && -qd / 10 < 2 * sf) {
                                isBetter = true;
                            }
                        }
                        if (isBetter) {
                            if (free) {
                                bestFreeNet = net;
                                bestFreeAP = ap;
                            }
                            else {
                                bestPaidNet = net;
                                bestPaidAP = ap;
                            }
                        }
                        break;
                    }
                }
            }
            let net = undefined;
            let ap = undefined;
            if (bestFreeNet !== undefined && bestFreeAP !== undefined) {
                console.log('Best free network found: ' + bestFreeAP.ssid);
                net = bestFreeNet;
                ap = bestFreeAP;
            }
            else if (bestPaidNet !== undefined && bestPaidAP !== undefined) {
                console.log('Best paid network found: ' + bestPaidAP.ssid);
                net = bestPaidNet;
                ap = bestPaidAP;
            }
            if (net !== undefined && ap !== undefined) {
                console.log('Getting current connections');
                wifi.getCurrentConnections((err, conns) => {
                    if (err) {
                        console.err(err);
                        setTimeout(this._connectLoop.bind(this), this._connectInterval);
                        return;
                    }
                    else if (conns.length === 0) {
                        console.log('no current connection');
                        setTimeout(this._connectLoop.bind(this), this._connectInterval);
                        return;
                    }
                    else {
                        let conn = conns[0];
                        if (conn.ssid === ap.ssid && (conn.bssid === net.bssid || conn.quality+5 >= net.quality)) {
                            console.log('Connected to best network already');
                            setTimeout(this._connectLoop.bind(this), this._connectInterval);
                            return;
                        }
                        let connap = undefined;
                        for (let i = 0; i < this._aps; i++) {
                            if (conn.ssid === this._aps[i].ssid) {
                                connap = this._aps[i];
                                break;
                            }
                        }
                        let isBetter = false;
                        if (connap === undefined) {
                            isBetter = true;
                        }
                        else if (ap.cost === 0 && connap.cost > 0) {
                            isBetter = true;
                        }
                        else if ((ap.cost === 0) === (connap.cost === 0)) {
                            let qd = net.quality - conn.quality;
                            let sf = ap.speed / connap.speed;
                            if (qd > 0) {
                                if (conn.quality < minQuality) {
                                    isBetter = true;
                                }
                                else if (sf >= 1) {
                                    isBetter = true;
                                }
                                else if (qd / 10 < 2 * sf) {
                                    isBetter = true;
                                }
                            }
                            else if (sf > 1) {
                                if (qd >= this._minQuality && -qd / 10 < 2 * sf) {
                                    isBetter = true;
                                }
                            }
                        }
                        if (isBetter) {
                            console.log('Connecting to ' + ap.ssid);
                            wifi.connect({ssid:ap.ssid, password:ap.psk}, err => {
                                if (err) {
                                    console.err(err);
                                }
                                console.log('Connected to ' + ap.ssid);
                                setTimeout(this._connectLoop.bind(this), this._connectInterval);
                            });
                        }
                        else {
                            console.log('Not reconnecting');
                            setTimeout(this._connectLoop.bind(this), this._connectInterval);
                        }
                    }
                });
            }
            else {
                setTimeout(this._connectLoop.bind(this), this._connectInterval);
            }
        });
    }
    _sendLoop() {
        // if (this._ws.readyState === 1) {
        //     //TODO: implement
        //     try {
        //         this._ws.send('test');
        //     } catch(ignored) {}
        //     setTimeout(this._sendLoop.bind(this), 500);
        //     return;
        // }
        // if (this._ws.readyState === 3) {
        //     try {
        //         this._ws.terminate();
        //     } catch(ignored) {}
        //     try {
        //         this._ws = new WebSocket('ws://127.0.0.1:8080');
        //     } catch(ignored) {}
        //     setTimeout(this._sendLoop.bind(this), 500);
        //     return;
        // }
        // else {
        //     setTimeout(this._sendLoop.bind(this), 500);
        //     return;
        // }
    }
}

let ap0 = new AP('cw-2.4', '9edFrBDobS', 0, 120);
let ap1 = new AP('telenet-A837A-extended', '57735405', 0, 50);
let ap2 = new AP('XT1635-02 4458', 'shagra2018', 10, 5);


router = new Router();
router.addAP(ap0);
router.addAP(ap1);
router.addAP(ap2);

