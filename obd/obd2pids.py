PIDParsingMap = dict()
PID03Map = dict()

class PIDMap:
	BYTES_TO_READ = 0
	DESCRIPTION = 1
	PARSE_FUCTION = 2
	UNIT = 3

def parseSupportedPIDs(data, start):
	supportedPIDs = []
	byteCounter = start

	# Go over every byte in the bytearray
	for tempByte in data:
		# The structure of the bytearray in binary is this:
		# [A, B, C , D]
		# If we represent the bytes in binary we get
		# [A0, A1, A2, ..., A7, B0, B1, ..., D7]
		# If A1 is 1 that means PID start + 0 is supported
		# If A2 is 1 that means PID start + 1 is supported
		# If A8 is 1 that means PID start + 7 is supported
		# If B0 is 1 that means PID start + 8 is supported

		# Create a mask extracting the first bit from left
		mask = 0b10000000
		# Check every bit
		for i in range(8):
			# Do a bitwise check
			supportsPID = (tempByte & mask) == mask

			# Add the PID if it's supported
			if supportsPID:
				supportedPIDs.append(byteCounter)
			
			# Increase the byteCounter
			# Shift the bitmask one to the right
			byteCounter += 1
			mask = mask >> 1

	return supportedPIDs

def getBitAsBoolean(byte, bitIndex): 
	mask = 0x1 << bitIndex
	return byte & mask == mask

def parsePID01(data):
	a = data[0]
	b = data[1]
	c = data[2]
	d = data[3]

	returnObject = {
		"Check Engine Light": getBitAsBoolean(a, 7),
		"Diagnostic Trouble Code": a & 0b01111111,
		"Spark Ignition Monitors Supported": not getBitAsBoolean(b, 3),
		"Spark Ignition Monitors": None,
		"Compression Ignition Monitors Supported": getBitAsBoolean(b, 3),
		"Compression Ignition Monitors": None,
		"Misfire": {
			"Test Available": getBitAsBoolean(b, 0),
			"Test Incomplete": getBitAsBoolean(b, 4)
		},
		"Components": {
			"Test Available": getBitAsBoolean(b, 2),
			"Test Incomplete": getBitAsBoolean(b, 6)
		},
		"Fuel System": {
			"Test Available": getBitAsBoolean(b, 1),
			"Test Incomplete": getBitAsBoolean(b, 5)
		}
	}

	if getBitAsBoolean(data[1], 3):
		returnObject["Compression Ignition Monitors"] = {
			"EGR and/or VVT System": {
				"Test Available": getBitAsBoolean(c, 7),
				"Test Incomplete": getBitAsBoolean(d, 7)
			},
			"PM Filter Monitoring": {
				"Test Available": getBitAsBoolean(c, 6),
				"Test Incomplete": getBitAsBoolean(d, 6)
			},
			"Exhaust Gas Sensor": {
				"Test Available": getBitAsBoolean(c, 5),
				"Test Incomplete": getBitAsBoolean(d, 5)
			},
			"Reserved0": {
				"Test Available": getBitAsBoolean(c, 4),
				"Test Incomplete": getBitAsBoolean(d, 4)
			},
			"Boost Pressure": {
				"Test Available": getBitAsBoolean(c, 3),
				"Test Incomplete": getBitAsBoolean(d, 3)
			},
			"Reserved1": {
				"Test Available": getBitAsBoolean(c, 2),
				"Test Incomplete": getBitAsBoolean(d, 2)
			},
			"NOx/SCR Monitor": {
				"Test Available": getBitAsBoolean(c, 1),
				"Test Incomplete": getBitAsBoolean(d, 1)
			},
			"NMHC Catalyst": {
				"Test Available": getBitAsBoolean(c, 0),
				"Test Incomplete": getBitAsBoolean(d, 0)
			}
		}
	else: 
		returnObject["Spark Ignition Monitors"] = {
			"EGR System": {
				"Test Available": getBitAsBoolean(c, 7),
				"Test Incomplete": getBitAsBoolean(d, 7)
			},
			"Oxygen Sensor Heater": {
				"Test Available": getBitAsBoolean(c, 6),
				"Test Incomplete": getBitAsBoolean(d, 6)
			},
			"Oxygen Sensor": {
				"Test Available": getBitAsBoolean(c, 5),
				"Test Incomplete": getBitAsBoolean(d, 5)
			},
			"A/C Refrigerant": {
				"Test Available": getBitAsBoolean(c, 4),
				"Test Incomplete": getBitAsBoolean(d, 4)
			},
			"Secondary Air System": {
				"Test Available": getBitAsBoolean(c, 3),
				"Test Incomplete": getBitAsBoolean(d, 3)
			},
			"Evaporative System": {
				"Test Available": getBitAsBoolean(c, 2),
				"Test Incomplete": getBitAsBoolean(d, 2)
			},
			"Heated Catalyst": {
				"Test Available": getBitAsBoolean(c, 1),
				"Test Incomplete": getBitAsBoolean(d, 1)
			},
			"Catalyst": {
				"Test Available": getBitAsBoolean(c, 0),
				"Test Incomplete": getBitAsBoolean(d, 0)
			}
		}

	return returnObject


def parsePID03(data):
	global PID03Map
	f1 = None 
	f2 = None

	if data[0] in PID03Map:
		f1 = PID03Map[data[0]]
	else:
		f1 = "Invalid response: " + str(data[0])
	if data[1] in PID03Map:
		f2 = PID03Map[data[1]]
	else:
		f2 = "Invalid response: " + str(data[1])

	return {
		"Fuel System 1": f1,
		"Fuel System 2": f2
	}

###############	
# 0x00 - 0x19 #
###############
PID03Map[1] = "Open loop due to insufficient engine temperature"
PID03Map[2] = "Closed loop, using oxygen sensor feedback to determine fuel mix"
PID03Map[4] = "Open loop due to engine load OR fuel cut due to deceleration"
PID03Map[8] = "Open loop due to system failure"
PID03Map[16] = "Closed loop, using at least one oxygen sensor but there is a fault in the feedback system"

PIDParsingMap[0x0] = (4, "PIDs supported [01-20]", lambda data: parseSupportedPIDs(data, 0x01), None)
PIDParsingMap[0x01] = (4, "Monitor status since DTCs cleared.", lambda data: parsePID01(data), None) 				
PIDParsingMap[0x02] = (2, "Freeze DTC", lambda data: (data[0] << 8) + data[1], None)
PIDParsingMap[0x03] = (2, "Fuel system status", lambda data: parsePID03(data), None)
PIDParsingMap[0x04] = (1, "Calculated engine load", lambda data: float(data[0]) / 2.55, "%")
PIDParsingMap[0x05] = (1, "Engine coolant temperature", lambda data: float(data[0] - 40), "°C")
PIDParsingMap[0x06] = (1, "Short term fuel trim -- Bank 1", lambda data: (data[0] / 1.28) - 100, "%")
PIDParsingMap[0x07] = (1, "Short term fuel trim -- Bank 1", lambda data: (data[0] / 1.28) - 100, "%")
PIDParsingMap[0x08] = (1, "Short term fuel trim -- Bank 2", lambda data: (data[0] / 1.28) - 100, "%")
PIDParsingMap[0x09] = (1, "Short term fuel trim -- Bank 2", lambda data: (data[0] / 1.28) - 100, "%")
PIDParsingMap[0x0A] = (1, "Fuel pressure", lambda data: float(data[0] * 3), "kPa")
PIDParsingMap[0x0B] = (1, "Intake manifold absolute pressure", lambda data: data[0], "kPa")
PIDParsingMap[0x0C] = (2, "Engine RPM", lambda data: ((256 * float(data[0])) + float(data[1])) / 4, "rpm")
PIDParsingMap[0x0D] = (1, "Vehicle speed", lambda data: (float(data[0])), "km/h")
PIDParsingMap[0x0E] = (1, "Timing advance", lambda data: (data[0] / 2) - 64, "° before TDC")
PIDParsingMap[0x0F] = (1, "Intake air temperature", lambda data: (float(data[0] - 40)), "°C")
PIDParsingMap[0x10] = (2, "MAF air flow rate", lambda data: (2.56 * data[0]) + data[1], "grams/sec")
PIDParsingMap[0x11] = (1, "Throttle position", lambda data: (data[0] / 2.55), "%")

###############	
# 0x20 - 0x39 #
###############
PIDParsingMap[0x20] = (4, "PIDs supported [21-40]", lambda data: parseSupportedPIDs(data, 0x21), None)

###############	
# 0x40 - 0x59 #
###############
PIDParsingMap[0x40] = (4, "PIDs supported [41-60]", lambda data: parseSupportedPIDs(data, 0x41), None)

###############	
# 0x60 - 0x79 #
###############
PIDParsingMap[0x60] = (4, "PIDs supported [61-80]", lambda data: parseSupportedPIDs(data, 0x61), None)

###############	
# 0x80 - 0x99 #
###############
PIDParsingMap[0x80] = (4, "PIDs supported [81-A0]", lambda data: parseSupportedPIDs(data, 0x81), None)

###############	
# 0xA0 - 0xB9 #
###############
PIDParsingMap[0xA0] = (4, "PIDs supported [A1-C0]", lambda data: parseSupportedPIDs(data, 0xA1), None)

###############	
# 0xC0 - 0xD9 #
###############
PIDParsingMap[0xC0] = (4, "PIDs supported [C1-E0]", lambda data: parseSupportedPIDs(data, 0xC1), None)
