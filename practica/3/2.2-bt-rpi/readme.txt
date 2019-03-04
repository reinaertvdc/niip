1) Install these packages:
	- hostapd
	- dnsmasq

2) Stop networking daemons:
	- sudo service hostapd stop
	- sudo service dnsmasq stop
	- sudo service dhcpcd stop

3) Create a virtual interface for our AP:
	- sudo iw dev wlan0 interface add uap0 type __ap

4) Append this to /etc/dhcpcd.conf (backup the original file)
	interface uap0 
		static ip_address=192.168.7.1/24
		nohook wpa_supplicant 

5) Create or replace /etc/dnsmasq.conf (backup the original file)
	interface=lo,uap0
	except-interface=lo,wlan0
	bind-interfaces
	server=8.8.8.8
	dhcp-range=192.168.7.100,192.168.7.200,12h

6) Create or replace /etc/hostapd/hostapd.conf (backup the original file)
	interface=uap0
	ssid=brw-pi
	hw_mode=g
	channel=1
	macaddr_acl=0
	auth_algs=1
	ignore_broadcast_ssid=0
	wpa=2
	wpa_passphrase=brentreinaertwout
	wpa_key_mgmt=WPA-PSK
	wpa_pairwise=TKIP
	rsn_pairwise=CCMP

7) Run these commands in sequence:
	- sudo systemctl daemon-reload
	- sudo service hostapd start
	- sudo service dhcpcd start
	- sudo service dnsmasq start

8) Check if wlan0 and uap0 received ip addresses 
	8.1) If they do: Congratulations
	8.2) If wlan0 has no ip run for some reason:
		- sudo dhclient -v wlan0
	8.3) If uap0 has no ip for some reason: 
		- reboot and try again
