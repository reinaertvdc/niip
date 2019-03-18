#!/bin/bash

# Default com device
comdevice=""

if [ -z "$1" ]
then
	comdevice="rfcomm0"
else
	comdevice="$1"
fi

echo "[Bluetooth] Checking bluetooth status..."
softblocked=$(rfkill list | grep -A 2 "Bluetooth" | grep -oP "Soft blocked: \K.*")
hardblocked=$(rfkill list | grep -A 2 "Bluetooth" | grep -oP "Hard blocked: \K.*")

if [[ $hardblocked == *"yes"* ]];
then
	echo "[Bluetooth] Bluetooth is hardblocked, please turn on your bluetooth with the hardware switch on your device."
	exit 1
fi

if [[ $softblocked == *"yes"* ]];
then
	echo "[Bluetooth] Bluetooth is softblocked, attempting to enable bluetooth..."
	echo $(rfkill unblock bluetooth)
	sleep 5

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

echo "[OBDII] Searching for OBDII MAC Address..."
OBDMAC=$(hcitool scan | grep "OBDII" | grep -P "[A-F0-9]{2}(:[A-F0-9]{2}){5}" -o)

if [ -z "$OBDMAC" ]
then
	echo "[OBDII] OBDII device was not found."
	exit 1
else
	echo "[OBDII] Found OBDII device at $OBDMAC"
fi

echo "[OBDII] Killing all running rfcomm instances..."
sudo killall rfcomm

echo "[OBDII] Opening comport on device: /dev/$comdevice"
sudo rfcomm connect "/dev/$comdevice" "$OBDMAC" 1 &

