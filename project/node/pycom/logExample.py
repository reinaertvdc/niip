import random
import time

from LogServer import LogServer
from ThreadManager import ThreadManager


class RandomSource:
    def __init__(self):
        pass

    def getRandomNumber(self, min, max):
        return random.randint(min, max)

    def getRandomFloat(self, min, max):
        return random.uniform(min, max)


printer = RandomSource()

server = LogServer("0.0.0.0", 8080)
server.registerDataSource("random-int", printer.getRandomNumber, 0, 100)
server.registerDataSource("random-int", printer.getRandomNumber, 100, 200)
server.registerDataSource("random-float", printer.getRandomFloat, 1.0, 2.0)
server.listen()

# Retrieve data from all "random-int" sources
"""
{
	"get-data": {
		"mode": "all",
		"sources": ["random-int"]
	}
}
"""

# Retrieve data from first "random-int" source
"""
{
	"get-data": {
		"mode": "any",
		"sources": ["random-int"]
	}
}
"""


# Retrieve data from all "random-int" and "random-float" sources
"""
{
	"get-data": {
		"mode": "all",
		"sources": ["random-int", "random-float"]
	}
}
"""
