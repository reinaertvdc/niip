import pycom
import time

from LoRaHelper import LoRaHelper

lora = LoRaHelper('70B3D57ED001B0F1', '8DA915F8B2C27FADB377C67C63E20CF1')
print('LoRa MAC: ' + lora.mac())
print('LoRa join status: ' + str(lora.has_joined()))

while True:
    pycom.rgbled(0x000050)
    time.sleep(0.5)
    pycom.rgbled(0x000000)
    time.sleep(2)
