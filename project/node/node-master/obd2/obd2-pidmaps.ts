import { OBD2PID } from "./obd2-pid";

class OBD2PIDMap {
	public obd2map: { [pidNumber: number]: OBD2PID } = {}

	constructor() {
		this.init();	
	}

	public add(pidNumber: number, pid: OBD2PID): void {
		if(!(pidNumber in this.obd2map)) {
			this.obd2map[pidNumber] = pid;
		}
		else {
			throw "DuplicatePIDError: PID has already been added.";
		}
	}

	public get(pidNumber: number): OBD2PID {
		if(pidNumber in this.obd2map) {
			return this.obd2map[pidNumber];
		}

		return null;
	}

	public has(pidNumber: number): boolean {
		return pidNumber in this.obd2map;
	}

	private init(): void {
		this.initPIDs();	
	}

	private initPIDs(): void {
		this.init0_19();
		this.init20_39();
		this.init40_59();
		this.init60_79();
		this.init80_99();
		this.initA0_B9();
		this.initC0_D9();
	}

	// ADD PIDs from 0x0 to 0x19
	private init0_19(): void {
		// PID 0x0
		this.add(0x0, new OBD2PID(4, "PIDs supported [01-20]", (dataArray: Uint8Array) => {
			return OBD2PID.parseSupportedPIDs(dataArray, 0x01);
		}));
		// PID 0X01
		this.add(0x01, new OBD2PID(4, "Monitor status since DTCs cleared.", (dataArray: Uint8Array) => {
			let a: number = dataArray[0];
			let b: number = dataArray[1];
			let c: number = dataArray[2];
			let d: number = dataArray[3];
		
			let returnObject: Object = {
				"Check Engine Light": OBD2PID.getBitAsBoolean(a, 7),
				"Diagnostic Trouble Code": a & 0b01111111,
				"Spark Ignition Monitors Supported": !OBD2PID.getBitAsBoolean(b, 3),
				"Spark Ignition Monitors": null,
				"Compression Ignition Monitors Supported": OBD2PID.getBitAsBoolean(b, 3),
				"Compression Ignition Monitors": null,
				"Misfire": {
					"Test Available": OBD2PID.getBitAsBoolean(b, 0),
					"Test Incomplete": OBD2PID.getBitAsBoolean(b, 4)
				},
				"Components": {
					"Test Available": OBD2PID.getBitAsBoolean(b, 2),
					"Test Incomplete": OBD2PID.getBitAsBoolean(b, 6)
				},
				"Fuel System": {
					"Test Available": OBD2PID.getBitAsBoolean(b, 1),
					"Test Incomplete": OBD2PID.getBitAsBoolean(b, 5)
				}
			};
		
			if (OBD2PID.getBitAsBoolean(dataArray[1], 3)) {
				returnObject["Compression Ignition Monitors"] = {
					"EGR and/or VVT System": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 7),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 7)
					},
					"PM Filter Monitoring": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 6),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 6)
					},
					"Exhaust Gas Sensor": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 5),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 5)
					},
					"Reserved0": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 4),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 4)
					},
					"Boost Pressure": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 3),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 3)
					},
					"Reserved1": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 2),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 2)
					},
					"NOx/SCR Monitor": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 1),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 1)
					},
					"NMHC Catalyst": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 0),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 0)
					}
				};
			}
			else { 
				returnObject["Spark Ignition Monitors"] = {
					"EGR System": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 7),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 7)
					},
					"Oxygen Sensor Heater": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 6),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 6)
					},
					"Oxygen Sensor": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 5),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 5)
					},
					"A/C Refrigerant": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 4),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 4)
					},
					"Secondary Air System": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 3),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 3)
					},
					"Evaporative System": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 2),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 2)
					},
					"Heated Catalyst": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 1),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 1)
					},
					"Catalyst": {
						"Test Available": OBD2PID.getBitAsBoolean(c, 0),
						"Test Incomplete": OBD2PID.getBitAsBoolean(d, 0)
					}
				};
			}
			return returnObject;
		}));
		// PID 0X02
		this.add(0x02, new OBD2PID(2, "Freeze DTC", (dataArray: Uint8Array) => {
			return (dataArray[0] << 8) + dataArray[1];
		}));
		// PID 0X03
		this.add(0x03, new OBD2PID(2, "Fuel system status", (dataArray: Uint8Array) => {
			let f1 = null;
			let f2 = null;
			let statusMap = {
				0: "Not supported",
				1: "Open loop due to insufficient engine temperature",
				2: "Closed loop, using oxygen sensor feedback to determine fuel mix",
				4: "Open loop due to engine load OR fuel cut due to deceleration",
				8: "Open loop due to system failure",
				16: "Closed loop, using at least one oxygen sensor but there is a fault in the feedback system"
			};
			

			if (dataArray[0] in statusMap) {
				f1 = statusMap[dataArray[0]];
			}
			else {
				f1 = "Invalid number: " + String(dataArray[0]);
			}
			if (dataArray[1] in statusMap) {
				f2 = statusMap[dataArray[1]];
			}
			else {
				f2 = "Invalid number: " + String(dataArray[1])
			}
			return {
				"Fuel System 1": f1,
				"Fuel System 2": f2
			}
		}));
		// PID 0X04
		this.add(0x04, new OBD2PID(1, "Calculated engine load", (dataArray: Uint8Array) => {
			return dataArray[0] / 2.55;
		}, "%"));
		// PID 0X05
		this.add(0x05, new OBD2PID(1, "Engine coolant temperature", (dataArray: Uint8Array) => {
			return (dataArray[0] - 40);	
		}, "°C"));
		// PID 0X06
		this.add(0x06, new OBD2PID(1, "Short term fuel trim -- Bank 1", (dataArray: Uint8Array) => {
			return (dataArray[0] / 1.28) - 100;
		}, "%"));
		// PID 0X07
		this.add(0x07, new OBD2PID(1, "Short term fuel trim -- Bank 1", (dataArray: Uint8Array) => {
			return (dataArray[0] / 1.28) - 100;
		}, "%"));
		// PID 0X08
		this.add(0x08, new OBD2PID(1, "Short term fuel trim -- Bank 2", (dataArray: Uint8Array) => {
			return (dataArray[0] / 1.28) - 100;
		}, "%"));
		// PID 0X09
		this.add(0x09, new OBD2PID(1, "Short term fuel trim -- Bank 2", (dataArray: Uint8Array) => {
			return (dataArray[0] / 1.28) - 100;
		}, "%"));
		// PID 0X0A
		this.add(0x0A, new OBD2PID(1, "Fuel pressure", (dataArray: Uint8Array) => {
			return (dataArray[0] * 3);
		}, "kPa"));
		// PID 0X0B
		this.add(0x0B, new OBD2PID(1, "Intake manifold absolute pressure", (dataArray: Uint8Array) => {
			return dataArray[0];
		}, "kPa"));
		// PID 0X0C
		this.add(0x0C, new OBD2PID(2, "Engine RPM", (dataArray: Uint8Array) => {
			return ((256 * (dataArray[0])) + (dataArray[1])) / 4;
		}, "rpm"));
		// PID 0X0D
		this.add(0x0D, new OBD2PID(1, "Vehicle speed", (dataArray: Uint8Array) => {
			return (dataArray[0]);
		}, "km/h"));
		// PID 0X0E
		this.add(0x0E, new OBD2PID(1, "Timing advance", (dataArray: Uint8Array) => {
			return (dataArray[0] / 2) - 64;
		}, "° before TDC"));
		// PID 0X0F
		this.add(0x0F, new OBD2PID(1, "Intake air temperature", (dataArray: Uint8Array) => {
			return ((dataArray[0] - 40));
		}, "°C"));
		// PID 0X10
		this.add(0x10, new OBD2PID(2, "MAF air flow rate", (dataArray: Uint8Array) => {
			return (2.56 * dataArray[0]) + dataArray[1];
		}, "grams/sec"));
		// PID 0X11
		this.add(0x11, new OBD2PID(1, "Throttle position", (dataArray: Uint8Array) => {
			return (dataArray[0] / 2.55);
		}, "%"));

		// PID 0X1F
		this.add(0x1F, new OBD2PID(2, "Run time since engine start", (dataArray: Uint8Array) => {
			return (dataArray[0] * 256) + dataArray[1];
		}, "seconds"));
	}

	private init20_39(): void {
		// PID 0x20
		this.add(0x20, new OBD2PID(4, "PIDs supported [21-40]", (dataArray: Uint8Array) => {
			return OBD2PID.parseSupportedPIDs(dataArray, 0x21);
		}));

		// PID 0x33
		this.add(0x33, new OBD2PID(1, "Absolute Barometric Pressure", (dataArray: Uint8Array) => {
			return dataArray[0];
		}, "kPa"));

		this.add(0x42, new OBD2PID(2, "Control module voltage", (dataArray: Uint8Array) => {
			return (256 * dataArray[0] + dataArray[1]) / 1000;
		}, "V"));
			
		this.add(0x43, new OBD2PID(2, "Absolute load value", (dataArray: Uint8Array) => {
			return (1 / 2.55) * (256 * dataArray[0] + dataArray[1]);
		}, "%"));
			
		this.add(0x44, new OBD2PID(2, "Fuel–Air commanded equivalence ratio", (dataArray: Uint8Array) => {
			return (2 / 65536) * (256 * dataArray[0] + dataArray[1]);
		}, "ratio"));
			
		this.add(0x45, new OBD2PID(1, "Relative throttle position", (dataArray: Uint8Array) => {
			return dataArray[0] / 2.55;
		}, "%"));
			
		this.add(0x47, new OBD2PID(1, "Absolute throttle position B", (dataArray: Uint8Array) => {
			return dataArray[0] / 2.55;
		}, "%"));
			
		this.add(0x49, new OBD2PID(1, "Accelerator pedal position D", (dataArray: Uint8Array) => {
			return dataArray[0] / 2.55;
		}, "%"));
		
		this.add(0x4A, new OBD2PID(1, "Accelerator pedal position E", (dataArray: Uint8Array) => {
			return dataArray[0] / 2.55;
		}, "%"));
			
		this.add(0x4C, new OBD2PID(1, "Commanded throttle actuator", (dataArray: Uint8Array) => {
			return dataArray[0] / 2.55;
		}, "%"));
			
	}

	private init40_59(): void {
		this.add(0x40, new OBD2PID(4, "PIDs supported [41-60]", (dataArray: Uint8Array) => {
			return OBD2PID.parseSupportedPIDs(dataArray, 0x41);
		}));

	}

	private init60_79(): void {
		this.add(0x60, new OBD2PID(4, "PIDs supported [61-80]", (dataArray: Uint8Array) => {
			return OBD2PID.parseSupportedPIDs(dataArray, 0x61);
		}));

	}

	private init80_99(): void {
		this.add(0x80, new OBD2PID(4, "PIDs supported [81-A0]", (dataArray: Uint8Array) => {
			return OBD2PID.parseSupportedPIDs(dataArray, 0x81);
		}));

	}

	private initA0_B9(): void {
		this.add(0xA0, new OBD2PID(4, "PIDs supported [A1-C0]", (dataArray: Uint8Array) => {
			return OBD2PID.parseSupportedPIDs(dataArray, 0xA1);
		}));
	}

	private initC0_D9(): void {
		this.add(0xC0, new OBD2PID(4, "PIDs supported [C1-E0]", (dataArray: Uint8Array) => {
			return OBD2PID.parseSupportedPIDs(dataArray, 0xC1);
		}));
	}
}

export { OBD2PIDMap }