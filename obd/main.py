import obd2
import json

def jprint(v):
	print(json.dumps(v, indent=4))

obd = obd2.OBD2("/dev/rfcomm0")
jprint(obd.getAllData())