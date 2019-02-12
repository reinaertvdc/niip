#!/usr/bin/env python3

import board
import busio
import time
import sys
from _thread import start_new_thread

import Adafruit_SSD1306
import adafruit_ads1x15.ads1015 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
import Adafruit_GPIO.MCP230xx as MCP
import Adafruit_GPIO.SPI as SPI

from PIL import Image, ImageDraw

# # Raspberry Pi pin configuration:
RST = 24
# # Note the following are only used with SPI:
DC = 23
SPI_PORT = 0
SPI_DEVICE = 0

DISP_X_RES = 128
DISP_Y_RES = 64

posShipY = DISP_Y_RES / 2
posShipX = 2
mcpi2c = 0
testads = ADS.ADS1015(busio.I2C(board.SCL, board.SDA))
chan = AnalogIn(testads, ADS.P0)

bullets = []
alive = True


def drawShip():
    global draw
    global image
    x = posShipX
    y = posShipY
    draw.polygon([(x, y-3), (x+3, y), (x, y+3)], fill=1)


def initDisp():
    global disp
    global image
    global draw
    disp = Adafruit_SSD1306.SSD1306_128_64(
        rst=RST, dc=DC, spi=SPI.SpiDev(SPI_PORT, SPI_DEVICE, max_speed_hz=8000000))
    disp.begin()
    image = Image.new('1', (DISP_X_RES, DISP_Y_RES))
    draw = ImageDraw.Draw(image)


def updateBullets():
    for b in bullets:
        b["x"] = b["x"] + 3

        if b["x"] > DISP_X_RES:
            bullets.remove(b)


def drawBullets():
    global alive

    for b in bullets:
        draw.point([(b['x'], b['y'])], fill=1)

        if b["x"] > 57 and b["y"] >= 21 and b["y"] <= 27:
            alive = False


def drawTarget():
    global alive
    if alive:
        draw.arc([(58, 22), (62, 26)], 0, 360, fill=1)


def input_thread(mcp):
    global posShipY

    while 1:
        time.sleep(0.025)
        
        if mcp.input(1):
            shoot()

        val = chan.value

        posY = (int)((val) / 1638 * 48)
        if posY > 45:
            posY = 45
        elif posY < 3:
            posY = 3
        posShipY = posY

        if not alive:
            mcp.output(0, MCP.GPIO.HIGH)
        else:
            mcp.output(0, MCP.GPIO.LOW)

        updateBullets()

        draw.rectangle((0, 0, DISP_X_RES, DISP_Y_RES), outline=0, fill=0)
        disp.image(image)
        drawShip()
        drawBullets()
        drawTarget()
        disp.image(image)
        disp.display()


def shoot():
    print('%s %s' % (posShipX+3, posShipY))
    bullets.append({'x': posShipX+3, 'y': posShipY})


def createTargets():
    pass


if __name__ == '__main__':
    mcpi2c = MCP.MCP23017(0x20, busnum=1)
    # use pin 0 as OUTPUT, 1 as INPUT pin
    mcpi2c.setup(0, MCP.GPIO.OUT)
    mcpi2c.setup(1, MCP.GPIO.IN)
    print('start')

    initDisp()
    drawShip()

    start_new_thread(input_thread, (mcpi2c,))

    while 1:
        try:
            # Quick example: DONT DO THIS:
            time.sleep(5)
        except KeyboardInterrupt:
            print('ctrl-c detected, quiting')
            sys.exit()
