from pytrack import Pytrack
from L76GNSS import L76GNSS

py = Pytrack()
l76 = L76GNSS(py, timeout=60)
while True:
    coord = l76.coordinates()
    print('{}'.format(coord))
