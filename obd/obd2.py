import serial
import obd2pids

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

	def _sendCommand(self, command):
		command += "\r\n"
		if self._serial.writable():
			self._serial.write(command.encode())