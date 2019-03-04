from network import Bluetooth, WLAN
import pycom
import micropython
import struct
import machine
import binascii
from time import sleep as sleep

class PyWiFi(object):
    def __init__(self, mode, ssid=None, password=None, hidden=False):
        self._ssid = ssid
        self._hidden = hidden

        if mode == WLAN.STA_AP or mode == WLAN.AP:
            self._wlan = WLAN(mode = mode, ssid = ssid, auth = (WLAN.WPA2, password), hidden = hidden)
        else:
            self._wlan = WLAN(mode = mode)

    def connect(self, ssid, password, timeout = 5000):
        pycom.heartbeat(False)
        networks = self._wlan.scan()

        for network in networks:
            if network.ssid == ssid:
                print("[" + ssid + "]: connecting...")
                pycom.rgbled(0x110000)

                self._wlan.connect(network.ssid, auth=(network.sec, password), timeout=timeout)
                while not self._wlan.isconnected():
                    sleep(0.5)

                print("[" + ssid + "]: connected")
                pycom.rgbled(0x001100)

                break

    def printWLAN(self):
        print(self._wlan.ifconfig())

class PyBluetooth:
    def __init__(self):
        self._bt = Bluetooth()
        self._bt.callback(trigger = Bluetooth.CLIENT_CONNECTED, handler = self.onClientConnect, arg = self)
        self._bt.callback(trigger = Bluetooth.CLIENT_DISCONNECTED, handler = self.onClientConnect, arg = self)
        self._services = {}

    def __del__(self):
        self._bt.disconnect_client()

    def addService(self, uuid, isPrimary = False):
        self._services[uuid] = self._bt.service(self.formatUUID(uuid), isprimary=True)

    def getService(self, uuid):
        return self._services[uuid]

    def setAdvertisement(self, name, manufacturerData = None, serviceData = None, serviceUUID = None):
        self._name = name
        if serviceUUID != None:
            serviceUUID = self.formatUUID(serviceUUID)
        self._bt.set_advertisement(name=name, manufacturer_data = manufacturerData, service_data = serviceData, service_uuid = serviceUUID)

    def startAdvertisement(self):
        self._bt.advertise(True)

    def stopAdvertisement(self):
        self._bt.advertise(False)

    def formatUUID(self, uuid):
        uuid = uuid.encode().replace(b'-',b'')
        tmp = binascii.unhexlify(uuid)
        return bytes(reversed(tmp))

    def onClientConnect(self):
        events = self._bt.events()
        print("[" + self._name + "]: Client connected")
        pycom.heartbeat(False)
        pycom.rgbled(0x110011)

    def onClientDisconnect(self):
        print("[" + self._name + "]: Client disconnected")
        pycom.heartbeat(True)

SERVICE_ID = "8BADF00D-CAFE-8008-1337-BE00DEADBEEF"

wifi = PyWiFi(WLAN.STA_AP, "brw-123", "brentreinaertwout", True)
wifi.connect("EDM-Guest", "dulosi68")
wifi.printWLAN()

pycom.heartbeat(True)

bt = PyBluetooth()
bt.setAdvertisement("BRW-Pycom")
bt.addService(SERVICE_ID)
bt.startAdvertisement()
