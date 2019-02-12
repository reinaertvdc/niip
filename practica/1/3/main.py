#!/usr/bin/env python2

import os
import time

import RPi.GPIO as GPIO

BUTTON_PIN = 2
LED_PIN = 3

switchState = False
lastPress = time.time()


def buttonCallback(channel):
    global switchState
    global lastPress
    localTime = time.time()
    deltaTime = localTime - lastPress

    if deltaTime > 0.2:
        switchState = not switchState
        lastPress = localTime
        if switchState:
            GPIO.output(LED_PIN, GPIO.HIGH)
        else:
            GPIO.output(LED_PIN, GPIO.LOW)


GPIO.setmode(GPIO.BCM)

GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(LED_PIN, GPIO.OUT, initial=GPIO.LOW)

GPIO.add_event_detect(BUTTON_PIN, GPIO.RISING)
GPIO.add_event_callback(BUTTON_PIN, buttonCallback)

while True:
    try:
        time.sleep(0.1)
    except KeyboardInterrupt:
        GPIO.cleanup()
        break
