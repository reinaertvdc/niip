// Based on code from https://stackoverflow.com/questions/6213227/fastest-way-to-convert-a-number-to-radix-64-in-javascript

export class NumericBase64 {
    private static digitsStr: string = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-';
    private static digits: Array<string> = [];
    private static digitsMap: Map<string,number> = new Map<string,number>();
    private static init(): void {
        if (NumericBase64.digits.length === 0) {
            NumericBase64.digits = NumericBase64.digitsStr.split('');
            for (let i: number = 0; i < NumericBase64.digits.length; i++) {
                NumericBase64.digitsMap.set(NumericBase64.digits[i], i);
            }
        }
    }
    public static fromNumber(int32: number): string {
        NumericBase64.init();
        let result = '';
        while (true) {
            result = NumericBase64.digits[int32 & 0x3f] + result;
            int32 >>>= 6;
            if (int32 === 0)
                break;
        }
        return result;
    }
    public static toNumber(digitsStr: string): number {
        let result = 0;
        let digits = digitsStr.split('');
        for (let i = 0; i < digits.length; i++) {
            let tmp = NumericBase64.digitsMap.get(digits[i]);
            result = (result << 6) + (tmp === undefined ? 0 : tmp);;
        }
        return result;
    }
}