pidParsingMap = dict()

def parseResponse(pid, data):
	global pidParsingMap

	if pid not in pidParsingMap:
		return None

	return pidParsingMap[pid][1](data)	

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

##############	
# 0x0 - 0x20 #
##############
pidParsingMap[0x0] = ("PIDs supported [01-20]", lambda data: parseSupportedPIDs(data, 0x01))
pidParsingMap[0x01] = ("Monitor status since DTCs cleared.", lambda data: data) 				# STUB
pidParsingMap[0x02] = ("Freeze DTC", lambda data: data)											# STUB
pidParsingMap[0x03] = ("Fuel system status", lambda data: data)									# STUB
pidParsingMap[0x04] = ("Calculated engine load", lambda data: float(data[0]) / 2.55)
pidParsingMap[0x05] = ("Engine coolant temperature", lambda data: float(data[0] - 40))
pidParsingMap[0x0A] = ("Fuel pressure", lambda data: float(data[0] * 3))
pidParsingMap[0x0C] = ("Engine RPM", lambda data: ((256 * float(data[0])) + float(data[1])) / 4)
pidParsingMap[0x0D] = ("Vehicle speed", lambda data: (float(data[0])))
pidParsingMap[0x0F] = ("Intake air temperature", lambda data: (float(data[0] - 40)))