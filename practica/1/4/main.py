#!/usr/bin/env python2

import sys
import time

import Adafruit_GPIO.GPIO as GPIO
import Adafruit_GPIO.MCP230xx as MCP

LED_PIN = 8
BUTTON_PIN = 2
ADDRESS = 0x20
SLEEP_TIME = 0.1
BUS_NUM = 1

mcpi2c = MCP.MCP23017(ADDRESS, busnum=BUS_NUM)
mcpi2c.setup(LED_PIN, MCP.GPIO.OUT)

buttonState = False
hasReleased = True

while True:
    try:
        value = mcpi2c.input(BUTTON_PIN)

        if value and hasReleased:
            buttonState = not buttonState

            if buttonState:
                mcpi2c.output(LED_PIN, MCP.GPIO.HIGH)
            else:
                mcpi2c.output(LED_PIN, MCP.GPIO.LOW)

            hasReleased = False

        elif not value and not hasReleased:
            hasReleased = True

        time.sleep(SLEEP_TIME)

    except KeyboardInterrupt:
        mcpi2c.output(LED_PIN, MCP.GPIO.HIGH)
        sys.exit()
