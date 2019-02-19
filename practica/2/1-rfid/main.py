#!/usr/bin/env python3

# Based on https://github.com/cspencer/parallax-rfid-reader/blob/master/parallax.py

import serial
import time
import RPi.GPIO as GPIO
 
# RPI3 UART is on ttyS0
SERIAL_PORT = "/dev/ttyS0"
ENABLE_RFID_PIN = 23
 
def validate_rfid(code):
    # A valid code will be 12 characters long with the first char being
    # a line feed and the last char being a carriage return.
    s = code.decode("ascii")
 
    if (len(s) == 12) and (s[0] == "\n") and (s[11] == "\r"):
        # We matched a valid code.  Strip off the "\n" and "\r" and just
        # return the RFID code.
        return s[1:-1]
    else:
        # We didn't match a valid code, so return False.
        return False
 
def main():
    global ENABLE_RFID_PIN
    global SERIAL_PORT
 
    # SET BCM indexing
    GPIO.setmode(GPIO.BCM)
 
    # SETUP the pin to enable rfid
    GPIO.setup(ENABLE_RFID_PIN, GPIO.OUT)
    print("Enabling RFID reader on serial port: " + SERIAL_PORT)
    # Enable is inversed so setting to low enables it
    GPIO.output(ENABLE_RFID_PIN, GPIO.LOW)
   
    # Set up the serial port as per the Parallax reader's datasheet.
    ser = serial.Serial(baudrate = 2400,
                        bytesize = serial.EIGHTBITS,
                        parity   = serial.PARITY_NONE,
                        port     = SERIAL_PORT,
                        stopbits = serial.STOPBITS_ONE,
                        timeout = 1)
 
    # Wrap everything in a try block to catch any exceptions.
    try:
        # Loop forever, or until CTRL-C is pressed.
        while 1:
            # Read in 12 bytes from the serial port.
            data = ser.read(12)
 
            # Attempt to validate the data we just read.
            code = validate_rfid(data)
 
            # If validate_rfid() returned a code, display it.
            if code:
                print("Read RFID code: " + code)
    except:
        # If we caught an exception, then disable the reader by setting
        # the pin to HIGH, then exit.
        print("Disabling RFID reader...")
        GPIO.output(ENABLE_RFID_PIN, GPIO.HIGH)
 
if __name__ == "__main__":
    main()
