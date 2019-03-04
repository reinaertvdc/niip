from network import WLAN
import pycom
import micropython
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



wifi = PyWiFi(WLAN.STA_AP, "brw-123", "brentreinaertwout", True)
wifi.connect("EDM-Guest", "dulosi68")
wifi.printWLAN()

pycom.heartbeat(True)
