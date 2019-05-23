import pycom
import time
import sys
from network import WLAN
import usocket as socket
import json
import ubinascii as binascii

from LoRaHelper import LoRaHelper

lora = LoRaHelper('70B3D57ED001B0F1', '3AE1A6FABA8807F104A5745ACBD1EBBF')
print('LoRa MAC: ' + lora.mac())
if not lora.has_joined():
    sys.exit(-1)

def handle_command_send(js):
    if type(js) is not dict:
        return None
    data = js['data']
    b = binascii.a2b_base64(data)
    lora.send(b)
    return None

def handle_command_air(js):
    return lora.air_time()

def handle_command_mac(js):
    return lora.mac()

def handle_command_recv(js):
    return lora.recv()

def handle_command(js):
    return_vals = {}
    if 'send' in js:
        return_vals['send'] = handle_command_send(js['send'])
    if 'recv' in js:
        return_vals['recv'] = handle_command_recv(js['recv'])
    if 'mac' in js:
        return_vals['mac'] = handle_command_mac(js['mac'])
    if 'air' in js:
        return_vals['air'] = handle_command_air(js['air'])
    return return_vals

wlan = WLAN(mode=WLAN.AP, ssid='LogiTrack-LoRa', auth=(WLAN.WPA2,'logitrack'))
print(wlan.ifconfig(1))

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind((wlan.ifconfig(1)[0], 2222))
s.listen(1)
while True:
    conn, addr = s.accept()
    pycom.rgbled(0x000050)
    print('Connection from: ' + str(addr))
    buffer = bytes()
    while True:
        data = conn.recv(1024)
        if not data:
            break
        pycom.rgbled(0x505000)
        time.sleep(0.01)
        pycom.rgbled(0x000050)
        buffer += data
        if '\n\n' in buffer:
            jsonstr, buffer = buffer.decode('ascii').split('\n\n', 1)
            buffer = buffer.encode()
            try:
                js = json.loads(jsonstr)
                ret = handle_command(js)
                if ret is not None:
                    ret = (json.dumps(ret)+'\n').encode()
                    print(ret)
                    conn.send(ret)
            except Exception as e:
                print(e)
                pass
    pycom.rgbled(0x005000)
    print('Connection closed')
    try:
        conn.close()
    except:
        pass
