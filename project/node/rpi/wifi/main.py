#!/usr/bin/env python3


import time
import pywifi
import os
import threading


wifi = pywifi.PyWiFi()


class AP:

    def __init__(self, ssid, psk, cost, speed):
        self._ssid = ssid
        self._psk = psk
        self._cost = cost
        self._speed = speed
    
    def ssid(self):
        return self._ssid

    def psk(self):
        return self._psk

    def cost(self):
        return self._cost
    
    def speed(self):
        return self._speed


class Network:

    def __init__(self, profile):
        self.set_profile(profile)

    def set_profile(self, profile):
        self._ssid = profile.ssid
        self._bssid = profile.bssid
        self._profile = profile


class WifiSwitcher:

    def __init__(self, iface_name: str = None):
        self._iface = self._get_iface_by_name(iface_name)
        self._networks = []
    
    def _run_dhclient(self, release_first: bool = True):
        if (release_first):
            os.system('dhclient -r')
        os.system('dhclient')

    def _get_iface_by_name(self, name):
        ifs = wifi.interfaces()
        if name == None and len(ifs) > 0:
            return ifs[0]
        iface = None
        for i in ifs:
            if i.name() == name:
                iface = i
                break
        return iface
    
    def _parse_scan_results(self, res: [] = []):
        out = []
        for prof in res:
            net = Network(prof)
            out.append(net)
        return out
    
    def _get_status_from_iface_socket(self):
        status = dict()

        if self._iface.status() in [pywifi.const.IFACE_DISCONNECTED, pywifi.const.IFACE_INACTIVE]:
            return status
        
        tmp = self._iface._wifi_ctrl._send_cmd_to_wpas(self._iface.name(), 'STATUS', True)
        lines = tmp.split('\n')
        for l in lines:
            if '=' not in l:
                continue
            (key, val) = l.split('=', 1)
            if key.lower() == 'ssid':
                status['ssid'] = val
            if key.lower() == 'bssid':
                status['bssid'] = val
        
        tmp = self._iface._wifi_ctrl._send_cmd_to_wpas(self._iface.name(), 'SIGNAL_POLL', True)
        lines = tmp.split('\n')
        for l in lines:
            if '=' not in l:
                continue
            (key, val) = l.split('=', 1)
            if key.lower() == 'rssi':
                status['signal'] = int(val)

        return status
    
    def status(self):
        return self._get_status_from_iface_socket()

    def scan(self, wait: int = 5):
        if self._iface == None:
            return None
        self._iface.scan()
        time.sleep(wait)
        res = self._iface.scan_results()
        nets_old = self._networks
        self._networks = []
        for r in res:
            handled = False
            for n in nets_old:
                if r.ssid == n._ssid and r.bssid == n._profile.bssid:
                    n.set_profile(r)
                    self._networks.append(n)
                    handled = True
                    # print('old: ' + n._ssid + ' (' + n._bssid + ')')
                    break
            if not handled:
                print('new: ' + r.ssid + ' (' + r.bssid + ')')
                self._networks.append(Network(r))
        nets_names = [(n._ssid, n._bssid) for n in self._networks]
        for n in nets_old:
            if (n._ssid, n._bssid) not in nets_names:
                print('rem: ' + n._ssid + ' (' + n._bssid + ')')
        self._networks.sort(key=lambda x: x._profile.signal, reverse=True)
        return self._networks

    def networks(self):
        return self._networks

    def connect(self, ssid: str, psk: str = None, wait: int = 10, disconnect_wait: int = 5):
        tmp_status = self.status()
        should_check_status = False
        should_disconnect = False
        if 'ssid' in tmp_status and 'bssid' in tmp_status and 'signal' in tmp_status:
            should_disconnect = True
            if tmp_status['ssid'] == ssid:
                should_check_status = True
        for n in self.networks():
            if n._ssid == ssid:
                if should_check_status and (tmp_status['bssid'] == n._bssid or tmp['signal'] + 3 >= n._profile.signal):
                    print('Already connected to "best" bssid')
                    return True
                if should_disconnect:
                    self.disconnect(disconnect_wait)
                p = pywifi.Profile()
                p.ssid = n._ssid
                p.bssid = n._bssid
                for x in n._profile.akm: p.akm.append(pywifi.const.AKM_TYPE_WPA2PSK)
                p.auth = pywifi.const.AUTH_ALG_OPEN
                p.cipher = pywifi.const.CIPHER_TYPE_CCMP
                p.key = psk
                self._iface.remove_all_network_profiles()
                tmp_prof = self._iface.add_network_profile(p)
                self._iface.connect(tmp_prof)
                time.sleep(wait)
                if self._iface.status() == pywifi.const.IFACE_CONNECTED:
                    self._run_dhclient()
                    return True
        return False

    def disconnect(self, wait: int = 5):
        self._iface.disconnect()
        time.sleep(wait)


class WifiRouter:

    PROTO_TCP = 0
    PROTO_UDP = 1

    URGENT = 0
    NORMAL = 1
    NOCOST = 2
    
    def __init__(self, iface_name: str = None):
        self._aps = []
        self._switcher = WifiSwitcher(iface_name)
        self._buffer
    
    def add_ap(self, ap: AP):
        self._aps.append(AP)
    
    def send(self, dest_addr: str, dest_port: int, dest_proto: int, urgence: int, data: bytes):
        pass


r = WifiRouter()
r.add_ap(AP('cw-2.4', '9edFrBDobS', 0, 100))
r.add_ap(AP('telenet-A837A-extended', '57735405', 0, 40))
r.add_ap(AP('XT1635-02 4458', 'shagra2018', 10, 5))


tmp = r._switcher
tmp.scan()
tmp.connect('cw-2.4', '9edFrBDobS')
# tmp.connect('telenet-A837A-extended', '57735405')
# tmp.connect('XT1635-02 4458', 'shagra2018')
print(tmp.status())



# iface.disconnect()
# time.sleep(1)
# assert iface.status() in [const.IFACE_DISCONNECTED, const.IFACE_INACTIVE] 