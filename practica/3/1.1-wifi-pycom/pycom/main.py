from network import WLAN

import LIS2HH12
import LTR329ALS01
import MPL3115A2
import SI7006A20
from time import sleep as sleep
import socket
import json

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

    def listen(self):
        print("Listening for sockets.")
        self._socket.listen(1)
        while True:
            try:
                print("Waiting for socket")
                (clientSocket, address) = self._socket.accept()
                print("Got socket")
                while True:
                    data = json.dumps(self._sensor.getData()) + "\n"
                    print(data)
                    clientSocket.send(data)
                    sleep(0.5)
            except Exception as e:
                print(e)
                pass

pyServer = PyServer(10000)
pyServer.listen()
