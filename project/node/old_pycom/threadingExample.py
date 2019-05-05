import random
import time

from LogServer import LogServer
from ThreadManager import ThreadManager


class RandomSource:
    def __init__(self):
        pass

    def printRandom(self, amount, sleep):
        for i in range(amount):
            print("[{}]: {}".format(i, self.getRandomNumber(0, 10)))
            time.sleep(sleep)

    def getRandomNumber(self, min, max):
        return random.randint(min, max)


source = RandomSource()

manager = ThreadManager.getInstance()

print("Creating first thread.")
manager.createThread("source1", source.printRandom, 5, 0.2)
manager.getThread("source1").waitOn()

print("Creating second thread.")
manager.createThread("source2", source.printRandom, 10, 0.2)
print("Creating third thread.")
manager.createThread("source3", source.printRandom, 5, 1)

manager.waitForThreads()
