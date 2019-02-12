#!/usr/bin/env python2

from MOD_LCD3310 import MOD_LCD3310
from ADS1x15 import ADS1x15
import Adafruit_GPIO.MCP230xx as MCP
import Adafruit_BBIO.GPIO as GPIO

import time
import sys
from thread import start_new_thread

LCD_X_RES = 84
LCD_Y_RES = 48

posShipY = LCD_Y_RES / 2
posShipX = 2
mcpi2c = 0
testads = ADS1x15()

bullets = []
alive = True


def drawShip():
    global lcd
    x = posShipX
    y = posShipY
    lcd.Draw_Triangle(x, y-3, x+3, y, x, y+3)
    lcd.LCDUpdate()


def initLCD():
    global lcd
    lcd = MOD_LCD3310()
    lcd.LCDInit()
    lcd.LCDContrast(0xFF)


def updateBullets():
    for b in bullets:
        b["x"] = b["x"] + 3

        if b["x"] > LCD_X_RES:
            bullets.remove(b)


def drawBullets():
    global alive

    for b in bullets:
        lcd.Draw_Point(b["x"], b["y"])

        if b["x"] > 57 and b["y"] >= 21 and b["y"] <= 27:
            alive = False
    lcd.LCDUpdate()


def drawTarget():
    global alive
    print "hallo"
    if alive:
        lcd.Draw_Circle(60, 24, 3)
    lcd.LCDUpdate()


def input_thread(mcp):
    global posShipY

    while 1:
        time.sleep(0.025)

        if mcp.input(1):
            shoot()
        else:
            pass  # mcp.output(0, MCP.GPIO.LOW)

        val = testads.readADCSingleEnded(0)

        posY = (int)((val - 1700) / (3290 - 1700) * 48)
        if posY > 45:
            posY = 45
        elif posY < 3:
            posY = 3
        posShipY = posY

        if not alive:
            mcp.output(0, MCP.GPIO.HIGH)

        updateBullets()

        lcd.LCDClear()
        drawShip()
        drawBullets()
        drawTarget()


def shoot():
        # print "pang"
    bullets.append({"x": posShipX+3, "y": posShipY})


def createTargets():
    pass


if __name__ == '__main__':
    mcpi2c = MCP.MCP23017(0x20, busnum=1)
    # use pin 0 as OUTPUT, 1 as INPUT pin
    mcpi2c.setup(0, MCP.GPIO.OUT)
    mcpi2c.setup(1, MCP.GPIO.IN)
    print "start"

    initLCD()
    drawShip()

    start_new_thread(input_thread, (mcpi2c,))

    while 1:
        try:
            # Quick example: DONT DO THIS:
            time.sleep(5)
        except KeyboardInterrupt:
            print "ctrl-c detected, quiting"
            sys.exit()
