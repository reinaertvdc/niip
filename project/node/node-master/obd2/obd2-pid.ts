class OBD2PID {
	constructor(public bytesToRead: number, public description: string, public parseFunction: (dataArray: Uint8Array) => any, public dataUnit: string = null) {

	}

	public parse(dataArray: Uint8Array, addUnit: boolean = false): any {
		let data: any = this.parseFunction(dataArray);
		// Add the data unit if the output is just a number
		if((typeof data == "number") && addUnit && this.dataUnit != null) {
			data = String(data)
			data += this.dataUnit;
		}
		return data;
	}

	public static parseSupportedPIDs(dataArray: Uint8Array, startPIDNumber: number): number[] {
		let supportedPIDs: number[] = [];
		let byteCounter = startPIDNumber;
		
		// Go over every byte in the bytearray
		for(let i: number = 0; i < dataArray.length; i++) {
			let currentByte: number = dataArray[i];
			// The structure of the bytearray in binary is this:
			// [A, B, C , D]
			// If we represent the bytes in binary we get
			// [A0, A1, A2, ..., A7, B0, B1, ..., D7]
			// If A1 is 1 that means PID start + 0 is supported
			// If A2 is 1 that means PID start + 1 is supported
			// If A8 is 1 that means PID start + 7 is supported
			// If B0 is 1 that means PID start + 8 is supported

			// Create a mask extracting the first bit from left
			let mask: number = 0b10000000; // 0b10000000
			// Check every bit
			for(let i = 0; i < 8; i++) {
				// Do a bitwise check
				let supportsPID: boolean = (currentByte & mask) == mask

				// Add the PID if it's supported
				if(supportsPID) {
					supportedPIDs.push(byteCounter);
				}

				// Increase bytecounter
				// Shift the bitmask one to the right
				byteCounter++;
				mask = mask >> 1;
			}
		}

		return supportedPIDs;
	}

	public static getBitAsBoolean(byte: number, bitIndex: number): boolean {
		let mask: number = 0x1 << bitIndex;
		return (byte & mask) == mask;
	}
}

export { OBD2PID }