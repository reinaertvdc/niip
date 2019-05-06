export class ByteBuffer {

    private _baseSize: number;
    private _size: number;
    private _bytes: Buffer;

    constructor(size = 1024) {
        this._baseSize = size;
        this._size = 0;
        this._bytes = Buffer.allocUnsafe(this._baseSize);
    }

    get length() {
        return this._size;
    }
    
    public get bytes(): Readonly<Buffer> {
        return this._bytes;
    }

    public set bytes(bytes: Readonly<Buffer>) {
        if (bytes.length > this._bytes.length) {
            this._bytes = Buffer.allocUnsafe(bytes.length);
        }
        bytes.copy(this._bytes);
        this._size = bytes.length;
    }

    public setBytesFromArray(bytes: Array<any>) {
        if (bytes.length > this._bytes.length) {
            this._bytes = Buffer.allocUnsafe(bytes.length);
        }
        for (let i: number = 0; i < bytes.length; i++) {
            this._bytes[i] = bytes[i];
        }
        this._size = bytes.length;
    }

    public setBytesFromString(bytes: string) {
        if (bytes.length > this._bytes.length) {
            this._bytes = Buffer.from(bytes);
        }
        else {
            for (let i: number = 0; i < bytes.length; i++) {
                this._bytes[i] = bytes.charCodeAt(i);
            }
        }
        this._size = bytes.length;
    }

    public resetToBaseSize(factor: number = 1) {
        if (this._bytes.length > this._baseSize * factor) {
            this._bytes = Buffer.allocUnsafe(this._baseSize);
        }
    }

}

export class ByteBufferPool {

    private _baseSize: number = 1;
    private _resetFactor: number = 1;
    private _maxCount: number = 1;
    private _pool: Array<ByteBuffer> = [];

    public constructor(baseCount = 1024, baseSize = 1024, maxCountFactor = 4, baseSizeResetFactor = 4) {
        this._baseSize = baseSize;
        this._resetFactor = baseSizeResetFactor;
        this._maxCount = baseCount * maxCountFactor;
        for (let i: number = 0; i < baseCount; i++) {
            this._pool.push(new ByteBuffer(this._baseSize));
        }
    }

    public getBuffer(): ByteBuffer {
        if (this._pool.length > 0) {
            let buffer: ByteBuffer|undefined = this._pool.pop();
            if (buffer === undefined) {
                return new ByteBuffer(this._baseSize);
            }
            else {
                return buffer;
            }
        }
        else {
            return new ByteBuffer(this._baseSize);
        }
    }

    public addBuffer(buffer: ByteBuffer): void {
        if (this._pool.length >= this._maxCount) {
            return;
        }
        buffer.resetToBaseSize(this._resetFactor);
        this._pool.push(buffer);
    }

}