import sys
import socket
import json
from time import sleep

import machine
from machine import Timer
from network import WLAN
import _thread

import LIS2HH12
import LTR329ALS01
import MPL3115A2
import SI7006A20
from pycom import rgbled, heartbeat

color = 0x000000

class PySense:
    def __init__(self):
        self._accelerometer = LIS2HH12.LIS2HH12()
        self._lightSensor = LTR329ALS01.LTR329ALS01()
        self._tempPressureAlt = MPL3115A2.MPL3115A2()
        self._tempHumidity = SI7006A20.SI7006A20()

    def getRoll(self):
        return self._accelerometer.roll()

    def getPitch(self):
        return self._accelerometer.pitch()

    def getAcceleration(self):
        return self._accelerometer.acceleration()

    def getLuminosity(self):
        return self._lightSensor.light()

    def getTemperature1(self):
        return self._tempPressureAlt.temperature()

    def getTemperature2(self):
        return self._tempHumidity.temperature()

    def getHumidity(self):
        return self._tempHumidity.humidity()

    def getPressure(self):
        return self._tempPressureAlt.pressure()

    def getAltitude(self):
        return self._tempPressureAlt.altitude()

    def getData(self):
        acceleration = self.getAcceleration()

        data = {
            "gyro": {
                "pitch": self.getPitch(),
                "roll": self.getRoll(),
                "x": acceleration[0],
                "y": acceleration[1],
                "z": acceleration[2]
            },
            "light": self.getLuminosity(),
            "temperature1": self.getTemperature1(),
            "temperature2": self.getTemperature2(),
            "humidity": self.getHumidity()
        }

        if self.inPressureMode():
            data["pressure"] = self.getPressure()
        elif self.inAltitudeMode():
            data["altitude"] = self.getAltitude()

        return data

    def inPressureMode(self):
        return self._tempPressureAlt.mode == MPL3115A2.PRESSURE

    def inAltitudeMode(self):
        return self._tempPressureAlt.mode == MPL3115A2.ALTITUDE

class PyServer:
    def __init__(self, port):
        self._port = port
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._socket.bind(('', port))
        self._sensor = PySense()

    def listen(self, wlan: WlanThreaded):
        global color
        print('Listening for sockets.')
        self._socket.settimeout(5)
        self._socket.listen(1)
        while True:
            try:
                color = 0x000030
                print('Waiting for client connection')
                accepting = True
                while accepting:
                    try:
                        (clientSocket, address) = self._socket.accept()
                        color = 0x003000
                        print('Client connected from <%s>' % (str(address)))
                        accepting = False
                    except OSError as e:
                        if e.errno != 11:
                            raise e
                        elif not wlan.is_connected():
                            print('Disconnected from WLAN network')
                            raise e
                while True:
                    data = json.dumps(self._sensor.getData()) + '\n'
                    print(data)
                    clientSocket.send(data)
                    sleep(0.5)
            except KeyboardInterrupt:
                self._socket.close()
                break
            except OSError as e:
                self._socket.close()
                break
            except socket.error as e:
                self._socket.close()
                break

class WlanThreaded:
    TIMEOUT = 5000
    def __init__(self, ssid:str='', key:str=''):
        self._ssid = ssid
        self._key = key
        self._wlan = WLAN(mode=WLAN.STA)
        self._running = False
        _thread.start_new_thread(self._connect, ())

    def is_connected(self):
        return self._wlan.isconnected()

    def print_wlan(self):
        print(self._wlan.ifconfig())

    def stop(self):
        self._running = False

    def _connect(self):
        global color
        self._running = True
        try:
            while self._running:
                color = 0x300000
                print('Connecting to <%s>' % (self._ssid))
                self._wlan.scan()
                timer = Timer.Chrono()
                timer.start()
                self._wlan.connect(ssid=self._ssid, auth=(WLAN.WPA2, self._key), timeout=WlanThreaded.TIMEOUT)
                while not self._wlan.isconnected():
                    if not self._running:
                        break
                    duration = timer.read_ms()
                    if duration > WlanThreaded.TIMEOUT:
                        break
                    sleep(0.1)
                if self._running and self._wlan.isconnected():
                    self.print_wlan()
                    self._start_server()
        except KeyboardInterrupt:
            pass
        self._running = False
        color = 0xff0000
        print('Disconnecting from <%s>' % (self._ssid))
        while True:
            try:
                self._wlan.disconnect()
                break
            except KeyboardInterrupt:
                pass
        color = 0x000000
        print('Shutting down')

    def _start_server(self):
        global color
        color = 0x300030
        print('Starting server')
        pyServer = PyServer(10000)
        pyServer.listen(self)
        color = 0x300030
        print('Stopped server')

heartbeat(False)
wlan = WlanThreaded('brw-pi', 'brentreinaertwout')
try:
    while True:
        rgbled(0x000000)
        sleep(0.5)
        rgbled(color)
        sleep(0.1)
except KeyboardInterrupt:
    wlan.stop()
    sys.exit(0)
