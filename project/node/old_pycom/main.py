from ThreadManager import ThreadManager
from LogServer import LogServer
from PyTrackGPS import PyTrackGPS
import pycom


IP = "0.0.0.0"
PORT = 8080

manager = ThreadManager.getInstance()
gps = PyTrackGPS()
server = LogServer(IP, PORT)
server.registerDataSource("gps", gps.getCoordinates)
server.listen()
