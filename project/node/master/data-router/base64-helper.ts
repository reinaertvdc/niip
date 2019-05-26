// Based on code from https://stackoverflow.com/questions/6213227/fastest-way-to-convert-a-number-to-radix-64-in-javascript

export class NumericBase64 {
    public static encode(plain: number) {
        const buffer = Buffer.allocUnsafe(6);
        buffer.writeIntBE(plain, 0, 6);
        const base64 = buffer.toString("base64");
        const encoded = base64.replace(/\+/g, "-").replace(/\//g, "_");
        return encoded;
    }
    public static decode(encoded: string) {
        const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const buffer = Buffer.from(base64, "base64");
        const id = buffer.readIntBE(0, 6);
        return id;
    }
}
