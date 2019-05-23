import pycom
import binascii
import time
import usocket as socket
from network import LoRa

class LoRaHelper:

    def __init__(self, app_eui_hexstr, app_key_hexstr, debug_led=True, debug_output=True):
        self._debug = debug_output
        self._led = debug_led
        if self._led:
            pycom.heartbeat(False)
            pycom.rgbled(0x500000)
        self._app_eui = binascii.unhexlify(app_eui_hexstr)
        self._app_key = binascii.unhexlify(app_key_hexstr)
        self._air_time_base = 0
        tmp = pycom.nvs_get('air')
        if tmp is not None:
            self._air_time_base = tmp
        self._air_time = self._air_time_base
        self._sock = None
        self._lora = LoRa(mode=LoRa.LORAWAN, region=LoRa.EU868)
        if self._led:
            pycom.rgbled(0x500000)
        if self._debug:
            print('LoRaHelper (debug): LoRa MAC: ' + str(binascii.hexlify(self._lora.mac())))
            print('LoRaHelper (debug): Joining network ...')
        self._lora.join(activation=LoRa.OTAA, auth=(self._app_eui, self._app_key), timeout=0)
        tmp_on = True
        while not self._lora.has_joined():
            if self._debug:
                print('LoRaHelper (debug): Joining ...')
            time.sleep(1)
            tmp_on = not tmp_on
            if self._led:
                if tmp_on:
                    pycom.rgbled(0x502000)
                else:
                    pycom.rgbled(0x000000)
        if self._led:
            pycom.rgbled(0x505000)
        if self._debug:
            print('LoRaHelper (debug): LoRaWan network joined!')
        if self._debug:
            print('LoRaHelper (debug): Creating socket')
        self._sock = socket.socket(socket.AF_LORA, socket.SOCK_RAW)
        self._sock.setsockopt(socket.SOL_LORA, socket.SO_DR, 5)
        if self._led:
            pycom.rgbled(0x005000)
        if self._debug:
            print('LoRaHelper (debug): Creating socket')

    def mac(self):
        return binascii.hexlify(self._lora.mac()).upper().decode('utf-8')

    def has_joined(self):
        return self._lora.has_joined()

    def air_time(self):
        self._air_time = self._air_time_base + self._lora.stats().tx_time_on_air
        pycom.nvs_set('air', self._air_time)
        return self._air_time

    def send(self, data: bytes):
        if self._sock is None:
            self._sock = socket.socket(socket.AF_LORA, socket.SOCK_RAW)
            self._sock.setsockopt(socket.SOL_LORA, socket.SO_DR, 5)
        self._sock.setblocking(True)
        self._sock.send(data)
        self._sock.setblocking(False)
        self._air_time = self._air_time_base + self._lora.stats().tx_time_on_air
        pycom.nvs_set('air', self._air_time)

    def recv(self):
        if self._sock is None:
            self._sock = socket.socket(socket.AF_LORA, socket.SOCK_RAW)
            self._sock.setsockopt(socket.SOL_LORA, socket.SO_DR, 5)
        self._sock.setblocking(False)
        data = self._sock.recv(128)
        return data
