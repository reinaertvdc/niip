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
SSID='cw-5.0'
PSK='9edFrBDobS'
HNAME='rpi-cwout'
NODE='https://nodejs.org/dist/v12.3.1/node-v12.3.1-linux-armv7l.tar.xz'

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
echo '    git'
apt -y install git > /dev/null 2>&1
echo '    vim'
apt -y install vim > /dev/null 2>&1
echo '    dnsutils'
apt -y install dnsutils > /dev/null 2>&1
echo '    libffi-dev'
apt -y install libffi-dev > /dev/null 2>&1
echo '    python3'
apt -y install python3 > /dev/null 2>&1
echo '    python3-pip'
apt -y install python3-pip > /dev/null 2>&1

# Additional packages
echo 'Installing optional packages (apt)'
# apt -y install ranger > /dev/null 2>&1

# Install nodejs/npm
echo 'Installing nodejs/npm'
wget -O node.tar.xz "$NODE" > /dev/null 2>&1
tar xf ./node.tar.xz > /dev/null 2>&1
rm ./node.tar.xz > /dev/null 2>&1
mv ./node-* ./node > /dev/null 2>&1
cp -r ./node/bin /usr/local/ > /dev/null 2>&1
cp -r ./node/lib /usr/local/ > /dev/null 2>&1
cp -r ./node/include /usr/local/ > /dev/null 2>&1
cp -r ./node/share /usr/local/ > /dev/null 2>&1
rm -r ./node/ > /dev/null 2>&1

# Install nodejs packages/tools
echo 'Installing packages (npm)'
echo '    pm2'
npm install -g pm2 > /dev/null 2>&1
#echo '    typescript'
#npm install -g typescript > /dev/null 2>&1
#echo '    ts-node'
#npm install -g ts-node > /dev/null 2>&1
echo '    cd /home/pi/niip/ ; npm install'
su -c "cd /home/pi/niip/ ; npm install" - pi > /dev/null 2>&1

# Install docker and docker-compose
echo 'Installing docker & docker-compose'
echo '    docker (get.docker.com)'
curl -fsSL https://get.docker.com -o ./get-docker.sh > /dev/null 2>&1
sh ./get-docker.sh > /dev/null 2>&1
rm ./get-docker.sh > /dev/null 2>&1
echo '    docker-compose (pip3)'
pip3 install docker-compose > /dev/null 2>&1

# Switch to network-manager instead of dhcpcd
echo 'Switching from dhcpcd to network-manager'
apt -y install network-manager > /dev/null 2>&1
sed -i 's/managed=false/managed=true/g' /etc/NetworkManager/NetworkManager.conf > /dev/null 2>&1
nmcli con mod "Wired connection 1" ipv4.addresses "192.168.0.25/24" ipv4.method "manual" > /dev/null 2>&1
service dhcpcd stop > /dev/null 2>&1
service wpa_supplicant restart > /dev/null 2>&1
service network-manager restart > /dev/null 2>&1
systemctl disable dhcpcd > /dev/null 2>&1

# Start docker containers
echo 'Starting docker containers'
su -c "cd /home/pi/niip/docker/ ; docker-compose up -d" > /dev/null 2>&1

# Configuring pm2 and nodejs applications
echo 'Configuring pm2'
echo '    pm2 startup'
pm2 startup > /dev/null 2>&1
echo '    pm2 start'
su -c "cd /home/pi/niip/ ; pm2 start node -- /home/pi/niip/index.js -i /home/pi/niip/logs/waanrode-to-molenstede.txt" > /dev/null 2>&1
echo '    pm2 save'
pm2 save > /dev/null 2>&1

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
