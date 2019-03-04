from network import Bluetooth
import binascii

class PyBluetooth:
    def __init__(self, name, serviceUUID):
        self._bt = Bluetooth()
        self.setAdvertisement(name = name, serviceUUID = serviceUUID)
        self._bt.callback(trigger = Bluetooth.CLIENT_CONNECTED, handler = self.onClientConnect, arg = self)
        self._bt.callback(trigger = Bluetooth.CLIENT_DISCONNECTED, handler = self.onClientConnect, arg = self)
        self._services = {}

    def __del__(self):
        self._bt.disconnect_client()

    def addService(self, uuid, characteristicNumber = 0, isPrimary = False):
        self._services[uuid] = self._bt.service(self.formatUUID(uuid), nbr_chars=characteristicNumber, isprimary=True)
        return self._services[uuid]

    def getService(self, uuid):
        return self._services[uuid]

    def setAdvertisement(self, name, manufacturerData = None, serviceData = None, serviceUUID = None):
        self._name = name
        if serviceUUID != None:
            serviceUUID = self.formatUUID(serviceUUID)
        self._bt.set_advertisement(name=name, manufacturer_data = manufacturerData, service_data = serviceData, service_uuid = serviceUUID)

    def startAdvertisement(self):
        self._bt.advertise(True)

    def stopAdvertisement(self):
        self._bt.advertise(False)

    def formatUUID(self, uuid):
        uuid = uuid.encode().replace(b'-',b'')
        tmp = binascii.unhexlify(uuid)
        return bytes(reversed(tmp))

    def onClientConnect(self):
        events = self._bt.events()
        print("[" + self._name + "]: Client connected")
        pycom.heartbeat(False)
        pycom.rgbled(0x110011)

    def onClientDisconnect(self):
        print("[" + self._name + "]: Client disconnected")
        pycom.heartbeat(True)
