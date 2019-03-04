#!/usr/bin/env python3

# TCP client socket code based on https://pymotw.com/2/socket/tcp.html

import os
import socket
import sys
import time
from typing import Callable

class Client:
    INTERFACE = 'wlan0'
    SSID_CACHE_TIME = 3
    SERVER_ADDRESS = ('192.168.4.1', 10000)

    def __init__(self):
        self.ssid = ''
        self.sock = None
        self.get_ssid(True)

    def get_ssid(self, force: bool = False) -> str:
        t = time.time()
        if (not force and t - self._ssid_last_pol < Client.SSID_CACHE_TIME):
            return self.ssid
        print('Renewing SSID')
        self._ssid_last_pol = t
        self.ssid = os.popen('iwconfig ' + Client.INTERFACE + ' \
            | grep \'ESSID\' \
            | awk \'{print $4}\' \
            | awk -F\\" \'{print $2}\'').read()
        return self.ssid
    
    def run_tcp_client(self, cb: Callable[[str],None]):
        print('Starting TCP client')
        cur_ssid = self.get_ssid()
        print('Current SSID: %s' % (cur_ssid))
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        print('Connecting to <%s> on port <%s>' % Client.SERVER_ADDRESS)
        try:
            self.sock.connect(Client.SERVER_ADDRESS)
            self.sock.settimeout(2)
        except Exception as e:
            print('Failed to connect!')
            print(e)
            return
        if not self.sock:
            print('Failed to connect!')
            return
        print('Connected')
        try:
            while True:
                if cur_ssid != self.get_ssid():
                    print('SSID changed from <%s> to <%s>' % (cur_ssid.strip(), self.ssid.strip()))
                    break
                data = self.sock.recv(1)
                cb(data)
                if not data:
                    break
        except Exception as e:
            pass
        finally:
            self.sock.close()


if __name__ == '__main__':

    if len(sys.argv) >= 2:
        Client.SERVER_ADDRESS[0] = sys.argv[1]
    if len(sys.argv) >= 3:
        Client.SERVER_ADDRESS[1] = int(sys.argv[2])
    if len(sys.argv) >= 4:
        Client.INTERFACE = sys.argv[3]

    def cb(s: str):
        print(s.decode('ascii'), end='', flush=True)

    c = Client()

    try:
        while True:
            while not c.get_ssid().startswith('brw'):
                print('Currently connected SSID <%s> does not start with <brw>' % (c.ssid.strip()))
                time.sleep(1)
            print('Currently connected SSID <%s>' % (c.ssid))
            c.run_tcp_client(cb)
            time.sleep(1)
    except KeyboardInterrupt:
        print('')
