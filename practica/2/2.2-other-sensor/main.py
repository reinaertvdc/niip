#!/usr/bin/env python2

import time
from smbus import SMBus
import RPi.GPIO as GPIO



class L3G4200D(object):
    def __init__(self, bus, addr):
        self.bus = bus
        self.addr = addr
        self.CTRL_REG1 = 0x20
        self.CTRL_REG2 = 0x21
        self.CTRL_REG3 = 0x22
        self.CTRL_REG4 = 0x23
        self.CTRL_REG5 = 0x24

        self.OUT_TEMP = 0x26

        self.STATUS_REG = 0x27

        self.OUT_X_L = 0xA8
        self.OUT_X_H = 0xA9
        self.OUT_Y_L = 0xAA
        self.OUT_Y_H = 0xAB
        self.OUT_Z_L = 0xAC
        self.OUT_Z_H = 0xAD

        self.ctrlConfig1 = 0x07
        self.ctrlConfig2 = 0x00
        self.ctrlConfig3 = 0x00
        self.ctrlConfig4 = 0x00
        self.ctrlConfig5 = 0x80

    def setConfig1(self, dataRate1, dataRate0, bandWidth1, bandWidth0, powerDown, enableZ, enableY, enableX):
        config = 0x00
        
        if dataRate1:
            config = config | 0x80 
        if dataRate0:
            config = config | 0x40
        if bandWidth1:
            config = config | 0x20
        if bandWidth0:
            config = config | 0x10

        if powerDown:
            config = config | 0x08
        if enableZ:
            config = config | 0x04
        if enableY:
            config = config | 0x02
        if enableX:
            config = config | 0x01

        self.ctrlConfig1 = config

    def setConfig3(self, l1_int1, l1_boot, h_l_active, pp_od, l2_dataReady, l2_waterMark, l2_overRun, l2_empty):
        config = 0x00
        
        if l1_int1:
            config = config | 0x80 
        if l1_boot:
            config = config | 0x40
        if h_l_active:
            config = config | 0x20
        if pp_od:
            config = config | 0x10

        if l2_dataReady:
            config = config | 0x08
        if l2_waterMark:
            config = config | 0x04
        if l2_overRun:
            config = config | 0x02
        if l2_empty:
            config = config | 0x01

        self.ctrlConfig3 = config

    def setConfig4(self, blockDataUpdate, bigLittleEndian, fullScale1, fullScale0, selfTest1, selfTest0, spiMode):
        config = 0x00
        
        if blockDataUpdate:
            config = config | 0x80 
        if bigLittleEndian:
            config = config | 0x40
        if fullScale1:
            config = config | 0x20
        if fullScale0:
            config = config | 0x10

        if selfTest1:
            config = config | 0x04
        if selfTest0:
            config = config | 0x02
        if spiMode:
            config = config | 0x01

        self.ctrlConfig4 = config

    def read(self):
        status = self.readByte(self.STATUS_REG)
        print "STATUS: " + hex(status)

        if status & 0x08 == 0x08:
            data = self.bus.read_i2c_block_data(self.addr, self.OUT_X_L, 6)
            lsbX = data[0]
            msbX = data[1]
            lsbY = data[2]
            msbY = data[3]
            lsbZ = data[4]
            msbZ = data[5]

            xGyro = ((msbX << 8) | lsbX)
            yGyro = ((msbY << 8) | lsbY)
            zGyro = ((msbZ << 8) | lsbZ)

            print "RotationX: " + str(xGyro) + ", RotationY: " + str(yGyro) + ", RotationZ: " + str(zGyro)

    def readByte(self, register):
        return self.bus.read_i2c_block_data(self.addr, register, 1)[0]

    def startUp(self):
        #self.bus.write_word_data(self.addr, self.CTRL_REG2, self.ctrlConfig2)
        self.bus.write_byte_data(self.addr, self.CTRL_REG3, self.ctrlConfig3)
        self.bus.write_byte_data(self.addr, self.CTRL_REG4, self.ctrlConfig4)

        # WRITE Reference, INT1_THS, INT1_DUR, INT1_CFG

        #self.bus.write_word_data(self.addr, self.CTRL_REG5, self.ctrlConfig5)
        print "Sending data to CTRL_REG_1: " + hex(self.ctrlConfig1)
        self.bus.write_byte_data(self.addr, self.CTRL_REG1, self.ctrlConfig1)

    def shutDown(self):
        self.bus.write_byte_data(self.addr, self.CTRL_REG1, 0x17)
        time.sleep(1)

def onDataReady(channel):
    global sensor
    sensor.read()

DATA_READY_PIN = 21
sensor = L3G4200D(SMBus(1), 0x68)    

def main():
    global DATA_READY_PIN
    global sensor

    GPIO.setmode(GPIO.BCM)

    GPIO.setup(DATA_READY_PIN, GPIO.IN)

    GPIO.add_event_detect(DATA_READY_PIN, GPIO.RISING)
    GPIO.add_event_callback(DATA_READY_PIN, onDataReady)

    sensor.setConfig1(0, 0, 0, 1, 1, 1, 1, 1)
    sensor.setConfig3(0, 0, 0, 0, 1, 0, 0, 0)
    sensor.setConfig4(1, 0, 0, 0, 0, 0, 0)

    sensor.startUp()
    sensor.read()

    while True:
        try:
            time.sleep(0.5)
            #sensor.read()
        except KeyboardInterrupt:
            GPIO.cleanup()
            break

if __name__ == "__main__":
    main()
