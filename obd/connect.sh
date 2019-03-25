#!/bin/bash

# Default com device
comdevice=""

# Check if communication device name was given as argument
if [ -z "$1" ]
then
	comdevice="rfcomm0"
else
	comdevice="$1"
fi

# Commands to check bluetooth status, could be optimised but no big deal
echo "[Bluetooth] Checking bluetooth status..."
softblocked=$(rfkill list | grep -A 2 "Bluetooth" | grep -oP "Soft blocked: \K.*")
hardblocked=$(rfkill list | grep -A 2 "Bluetooth" | grep -oP "Hard blocked: \K.*")

# Check if "hardblocked: yes" was in the output
# If so, this means there should be a hardware switch on the device which needs to be turned on
# 	=> Not fixable in software
if [[ $hardblocked == *"yes"* ]];
then
	echo "[Bluetooth] Bluetooth is hardblocked, please turn on your bluetooth with the hardware switch on your device."
	exit 1
fi

# If we're not hardblocked we might be softblocked
# This is fixable in software if we have permissions
if [[ $softblocked == *"yes"* ]];
then
	echo "[Bluetooth] Bluetooth is softblocked, attempting to enable bluetooth..."
	echo $(rfkill unblock bluetooth)
	# Bluetooth needs a little time to activate
	sleep 5
	
	# Check if we fixed the softblock
	softblocked=$(rfkill list | grep -A 2 "Bluetooth" | grep -oP "Soft blocked: \K.*")
	if [[ $softblocked == *"yes"* ]];
	then
		echo "[Bluetooth] Unblocking bluetooth failed, there is probably a problem with your bluetooth drivers."
		exit 1
	else
		echo "[Bluetooth] Unblocking bluetooth succeeded."
	fi
else
	echo "[Bluetooth] Bluetooth ok."
fi

# This scans the bluetooth spectrum for a device with the name OBDII and retrieves its MAC address, this is not really secure so we should specify the MAC-Address in the future
echo "[OBDII] Searching for OBDII MAC Address..."
OBDMAC=$(hcitool scan | grep "OBDII" | grep -P "[A-F0-9]{2}(:[A-F0-9]{2}){5}" -o)

# Check if we found the device
if [ -z "$OBDMAC" ]
then
	echo "[OBDII] OBDII device was not found."
	exit 1
else
	echo "[OBDII] Found OBDII device at $OBDMAC"
fi

echo "[OBDII] Killing all running rfcomm instances..."
sudo killall rfcomm

# Open the communication 
echo "[OBDII] Opening comport on device: /dev/$comdevice"
sudo rfcomm connect "/dev/$comdevice" "$OBDMAC" 1 &

