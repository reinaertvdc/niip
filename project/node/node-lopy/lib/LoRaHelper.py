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
        self._lora = LoRa(mode=LoRa.LORAWAN)
        if self._led:
            pycom.rgbled(0x502000)
        if self._debug:
            print('LoRaHelper (debug): Loading LoRa configuration from nvram')
        self._lora.nvram_restore()
        if self._lora.has_joined():
            if self._led:
                pycom.rgbled(0x505000)
            if self._debug:
                print('LoRaHelper (debug): Configuration loaded correctly (network is joined)')
            self._lora.nvram_save()
            if self._led:
                pycom.rgbled(0x005000)
            if self._debug:
                print('LoRaHelper (debug): Configuration saved')
        else:
            if self._led:
                pycom.rgbled(0x500000)
            if self._debug:
                print('LoRaHelper (debug): No configuration found! Joining network ...')
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
            self._lora.nvram_save()
            if self._led:
                pycom.rgbled(0x005000)
            if self._debug:
                print('LoRaHelper (debug): Configuration saved')

    def mac(self):
        return binascii.hexlify(self._lora.mac()).upper().decode('utf-8')

    def has_joined(self):
        return self._lora.has_joined()

    def air_time(self):
        return self._air_time

    def send(self, data: bytes):
        s = socket.socket(socket.AF_LORA, socket.SOCK_RAW)
        s.setsockopt(socket.SOL_LORA, socket.SO_DR, 5)
        s.setblocking(True)
        s.send(data)
        self._air_time = self._air_time_base + self._lora.stats().tx_time_on_air
        pycom.nvs_set('air', self._air_time)
