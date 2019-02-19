#!/usr/bin/env python2

# based on script for raspberry pi: 
#http://raspberrypi.stackexchange.com/questions/1207/how-to-measure-temperature
import time
from smbus import SMBus

class MCP9804(object):
    def __init__(self, bus, addr):
        self.bus = bus
        self.addr = addr

    def wakeup(self):
        self.bus.write_word_data(self.addr, 1, 0x0000)

    def shutdown(self):
        self.bus.write_word_data(self.addr, 1, 0x0001)

    def get_temperature(self, shutdown=False):
        if shutdown:
            self.wakeup()
            time.sleep(0.26) # Wait for conversion

        msb, lsb =  self.bus.read_i2c_block_data(self.addr, 5, 2)

        if shutdown:
            self.shutdown()

        tcrit = msb>>7&1
        tupper = msb>>6&1
        tlower = msb>>5&1

        temperature = (msb&0xf)*16+lsb/16.0
        if msb>>4&1:
            temperature = 256 - temperature
        return temperature

def main():
    sensor = MCP9804(SMBus(1), 0x18)
    while True:
        print sensor.get_temperature()
        time.sleep(1)


if __name__ == "__main__":
    main()
