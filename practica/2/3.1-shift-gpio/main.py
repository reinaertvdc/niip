#!/usr/bin/env python3

'''
Library for 74HC595 shiftregister 
Based on similar script for raspberry pi https://github.com/mignev/shiftpi
'''

import RPi.GPIO as GPIO

from time import sleep


class SH74HC595:
    # Define pins
    _DATA_pin = 40  # pin 14 (DS) on the 75HC595 GPA0
    _LATCH_pin = 38  # pin 12 (STCP) on the 75HC595 LATCH GPA1
    _CLOCK_pin = 36  # pin 11 (SHCP) on the 75HC595 CLOCK GPA2

    # Define MODES
    ALL = -1
    HIGH = 1
    LOW = 0

    def __init__(self):
        self.gpio = GPIO
        self.gpio.setmode(GPIO.BOARD)
        self.gpio.setup(SH74HC595._DATA_pin, GPIO.OUT)
        self.gpio.setup(SH74HC595._LATCH_pin, GPIO.OUT)
        self.gpio.setup(SH74HC595._CLOCK_pin, GPIO.OUT)

        # is used to store states of all pins
        self._registers = list()
        self._number_of_shiftregisters = 1

    def digital_write(self, pin, mode):
        '''
        Allows the user to set the state of a pin on the shift register
        '''
        if pin == self.ALL:
            self.set_all(mode)
        else:
            if len(self_registers) == 0:
                self.set_all(self.LOW)
            self._set_pin(pin, mode)
        self._execute()

    def get_num_pins(self):
        return self._number_of_shiftregisters * 8

    def set_all(self, mode, execute=True):
        num_pins = self.get_num_pins()
        for pin in range(0, num_pins):
            self._set_pin(pin, mode)
        if execute:
            self._execute()

        return self._registers

    def _set_pin(self, pin, mode):
        try:
            self._registers[pin] = mode
        except IndexError:
            self._registers.insert(pin, mode)

    def _execute(self):
        num_pins = self.get_num_pins()
        self.mcpi2c.output(SH74HC595._LATCH_pin, GPIO.LOW)

        for pin in range(num_pins - 1, -1, -1):
            self.mcpi2c.output(SH74HC595._CLOCK_pin, GPIO.LOW)
            pin_mode = self._registers[pin]

            self.mcpi2c.output(SH74HC595._DATA_pin, pin_mode)
            self.mcpi2c.output(SH74HC595._CLOCK_pin, GPIO.HIGH)

        self.mcpi2c.output(SH74HC595._LATCH_pin, GPIO.HIGH)

    def shift_one(self, input_val):
        self.gpio.output(SH74HC595._CLOCK_pin, GPIO.LOW)

        if input_val == 1:
            self.gpio.output(SH74HC595._DATA_pin, GPIO.HIGH)
        else:
            self.gpio.output(SH74HC595._DATA_pin, GPIO.LOW)

        self.gpio.output(SH74HC595._CLOCK_pin, GPIO.HIGH)
        self.gpio.output(SH74HC595._DATA_pin, GPIO.LOW)

    def write_out(self):
        self.gpio.output(SH74HC595._LATCH_pin, GPIO.HIGH)
        sleep(0.04)
        self.gpio.output(SH74HC595._LATCH_pin, GPIO.LOW)

    def write_char(self, char_to_shift):
        for x in range(0, 7):
            self.shift_one((char_to_shift >> x) % 2)
        self.write_out()


if __name__ == "__main__":
    test = SH74HC595()

    count = 0
    try:
        while True:
            list = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F]
            value = ~ list[count % 10]

            for x in range(7, -1, -1):
                test.shift_one((value >> x) % 2)

            test.write_out()
            sleep(0.75)
            count += 1
            print(count)
    except KeyboardInterrupt:
        pass

GPIO.cleanup()
