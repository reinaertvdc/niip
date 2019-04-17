#!/bin/sh

# Add file 'ssh' in /boot partition
# Change static eth0 interface configuration in /rootfs/etc/dhcpcd.conf
# Connect to raspberry pi via ssh and run this script on it (from pi home directory for example)

if [ $(id -u) != "0" ]
then
	echo 'Please run script as root (sudo)'
	exit
fi

#TODO: change these variables to AP within range op the RPI
SSID='cw-2.4'
PSK='9edFrBDobS'
HNAME='rpi-cwout'

# Disable password requirements and set new password to 'ip'
echo 'Changing password of user "pi" to "ip"' > /dev/null 2>&1
sed -i 's/\ obscure\ /\ minlen=1\ /g' /etc/pam.d/common-password > /dev/null 2>&1
(echo ip ; echo ip) | passwd pi > /dev/null 2>&1

# Run raspi-config to set some default parameters in non-interupt mode
echo 'Running raspi-config'
raspi-config nonint do_ssh 0 > /dev/null 2>&1
raspi-config nonint do_boot_behaviour B1 > /dev/null 2>&1
raspi-config nonint do_boot_wait 1 > /dev/null 2>&1
raspi-config nonint do_camera 1 > /dev/null 2>&1
raspi-config nonint do_vnc 1 > /dev/null 2>&1
raspi-config nonint do_spi 1 > /dev/null 2>&1
raspi-config nonint do_i2c 1 > /dev/null 2>&1
raspi-config nonint do_serial 1 > /dev/null 2>&1
raspi-config nonint do_onewire 1 > /dev/null 2>&1
raspi-config nonint do_rgpio 1 > /dev/null 2>&1
# Set the wifi country to belgium
raspi-config nonint do_wifi_country BE > /dev/null 2>&1

# Connect to wireless network using wpa_supplicant
echo 'Connecting to wireless network'
wpa_passphrase "$SSID" "$PSK" | tee -a /etc/wpa_supplicant/wpa_supplicant.conf > /dev/null 2>&1
sed -i 's/#psk=".*"/#psk=""/g' /etc/wpa_supplicant/wpa_supplicant.conf > /dev/null 2>&1
wpa_cli -i wlan0 reconfigure > /dev/null 2>&1
sleep 10

# Upgrade packages
echo 'Upgrading packages (apt)'
apt update > /dev/null 2>&1
apt -y upgrade > /dev/null 2>&1

# Install some necessary packages
echo 'Installing packages (apt)'
apt -y install git vim dnsutils > /dev/null 2>&1

# Additional packages
echo 'Installing optional packages (apt)'
# apt -y install ranger > /dev/null 2>&1

# Install nodejs/npm
echo 'Installing nodejs/npm'
wget https://nodejs.org/dist/v11.14.0/node-v11.14.0-linux-armv7l.tar.xz > /dev/null 2>&1
tar xf ./node-v11.14.0-linux-armv7l.tar.xz > /dev/null 2>&1
rm ./node-v11.14.0-linux-armv7l.tar.xz > /dev/null 2>&1
cp -r ./node-v11.14.0-linux-armv7l/bin /usr/local/ > /dev/null 2>&1
cp -r ./node-v11.14.0-linux-armv7l/lib /usr/local/ > /dev/null 2>&1
cp -r ./node-v11.14.0-linux-armv7l/include /usr/local/ > /dev/null 2>&1
cp -r ./node-v11.14.0-linux-armv7l/share /usr/local/ > /dev/null 2>&1
rm -r ./node-v11.14.0-linux-armv7l/ > /dev/null 2>&1

# Install nodejs global packages/tools
echo 'Installing packages (npm)'
npm install -g pm2 > /dev/null 2>&1

# Switch to network-manager instead of dhcpcd
echo 'Switching from dhcpcd to network-manager'
apt -y install network-manager > /dev/null 2>&1
sed -i 's/managed=false/managed=true/g' /etc/NetworkManager/NetworkManager.conf > /dev/null 2>&1
nmcli con mod "Wired connection 1" ipv4.addresses "192.168.0.25/24" ipv4.method "manual" > /dev/null 2>&1
service dhcpcd stop > /dev/null 2>&1
service wpa_supplicant restart > /dev/null 2>&1
service network-manager restart > /dev/null 2>&1
systemctl disable dhcpcd > /dev/null 2>&1

# Change the hostname
echo 'Changing hostname'
raspi-config nonint do_hostname "$HNAME" > /dev/null 2>&1

# Remove this shell script
echo 'Removing shell script'
shred -u "$0" > /dev/null 2>&1

# Clear history (remove passwords etc)
echo 'Deleting history file'
shred -u ~/.bash_history > /dev/null 2>&1
touch ~/.bash_history > /dev/null 2>&1

# Reboot into new configuration
echo 'Rebooting'
reboot
