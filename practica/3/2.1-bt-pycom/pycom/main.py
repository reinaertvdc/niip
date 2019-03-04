from PyBluetooth import PyBluetooth
from PySense import PySense
from network import Bluetooth

SERVICE_ID = "8BADF00D-CAFE-8008-1337-BE00DEADBEEF"

pySense = PySense()
pyBlue = PyBluetooth("BRW-Pycom", SERVICE_ID)
pyBlue.startAdvertisement()

accelService = pyBlue.addService(SERVICE_ID, 1, True)
mode = "roll"
rollChar = accelService.characteristic(uuid=b"ab34567890123456", value=str(pySense.getRoll()))


def accelServiceHandler(characteristic):
    global rollChar
    global mode
    events = characteristic.events()

    if events & Bluetooth.CHAR_READ_EVENT:
        value = None

        if mode == "roll":
            value = str(pySense.getRoll())
        elif mode == "pitch":
            value = str(pySense.getPitch())
        elif mode == "xyz":
            value = str(pySense.getAcceleration())

        print("Sending value: " + value)
        rollChar.value(value)
    elif events & Bluetooth.CHAR_WRITE_EVENT:
        try:
            data = characteristic.value().decode("utf-8")
            print("Mode: " + data)
            if data == "roll":
                mode = "roll"
            elif data == "pitch":
                mode = "pitch"
            elif data == "xyz":
                mode = "xyz"
        except Exception as e:
            Pass 


rollChar.callback(trigger=Bluetooth.CHAR_WRITE_EVENT | Bluetooth.CHAR_READ_EVENT, handler=accelServiceHandler)
