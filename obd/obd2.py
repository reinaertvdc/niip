import serial
from obd2pids import *
from time import sleep

class Commands:
	SHOW_CURRENT_DATA = 0x01
	SHOW_FREEZE_FRAME_DATA = 0x02
	SHOW_STORED_DTCS = 0x03
	CLEAR_DTCS_AND_STORED_VALUES = 0x04
	TEST_RESULTS_OXYGEN_MONITORING = 0x05
	TEST_RESULTS_SYSTEM_MONITORING = 0x06
	SHOW_PENDING_DTCS = 0x07
	CONTROL_OPERATION = 0x08
	REQUEST_VEHICLE_INFORMATION = 0x09
	PERMANENT_DTCs = 0x0A

class OBD2:
	def __init__(self, device, baudrate = 38400, bytesize = 8, parity = 'N', stopbits = 1, timeout = None):
		self._serialInfo = {
			"device": device,
			"baudrate": baudrate, 
			"bytesize": bytesize,
			"parity": parity,
			"stopbits": stopbits, 
			"timeout": timeout
		}

		self._serial = serial.Serial(device, baudrate = baudrate, bytesize = bytesize, parity = parity, stopbits = stopbits, timeout = timeout)
	
	def _clear(self):
		self._serial.read(self._serial.in_waiting)

	def _sendCommand(self, command, value):
		self._clear()

		hexCommand = ("%0.2X" % command) 
		command = hexCommand + value

		if self._serial.writable():
			self._serial.write((command + "\r").encode())
		
		self._waitForReply()

		echo = self._readBytes(len((command + "\r").encode())).decode().strip()
		self._waitForReply()
		
		return echo == command
		
	def _waitForReply(self):
		while self._serial.in_waiting == 0:
			sleep(0.1)

	def _readBytes(self, bytesToRead):
		return self._serial.read(bytesToRead)

	def getSupportedPIDs(self):
		supportedPIDs = list()
		supportedPIDs.append(0)
		supportedPIDs += self.getPIDValue(0x0)
		print(supportedPIDs)
		if 0x20 == supportedPIDs[len(supportedPIDs) - 1]:
			supportedPIDs += self.getPIDValue(0x20)

		if 0x40 == supportedPIDs[len(supportedPIDs) - 1]:
			supportedPIDs += self.getPIDValue(0x40)

		if 0x60 == supportedPIDs[len(supportedPIDs) - 1]:
			supportedPIDs += self.getPIDValue(0x60)

		if 0x80 == supportedPIDs[len(supportedPIDs) - 1]:
			supportedPIDs += self.getPIDValue(0x80)

		if 0xA0 == supportedPIDs[len(supportedPIDs) - 1]:
			supportedPIDs += self.getPIDValue(0xA0)

		if 0xC0 == supportedPIDs[len(supportedPIDs) - 1]:
			supportedPIDs += self.getPIDValue(0xC0)

		print(supportedPIDs)
		return supportedPIDs

	def getAllData(self):
		supportedPIDs = self.getSupportedPIDs()
		pidMap = dict()

		for pid in supportedPIDs:
			if pid in PIDParsingMap:
				pidInfo = PIDParsingMap[pid]
				pidMap[pidInfo[PIDMap.DESCRIPTION]] = self.getPIDValue(pid)
				if pidInfo[PIDMap.UNIT] != None:
					pidMap[pidInfo[PIDMap.DESCRIPTION]] = str(pidMap[pidInfo[PIDMap.DESCRIPTION]]) + pidInfo[PIDMap.UNIT]
		return pidMap

	def getPIDValue(self, pid):
		global PIDParsingMap

		if pid not in PIDParsingMap:
			return "Not supported"
		
		if self._sendCommand(Commands.SHOW_CURRENT_DATA, "%0.2X" % pid):
			print("Sent PID command: " + str(pid))
			bytesToRead = PIDParsingMap[pid][PIDMap.BYTES_TO_READ] + 2
			bytesToRead = bytesToRead * 2 + (bytesToRead - 1)
			response = self._readBytes(bytesToRead).decode("utf-8").replace(" ", "")
			responseBytes = bytes.fromhex(response)
			rest = self._serial.read(self._serial.in_waiting).decode("utf-8")

			return PIDParsingMap[pid][PIDMap.PARSE_FUCTION](responseBytes[2:])