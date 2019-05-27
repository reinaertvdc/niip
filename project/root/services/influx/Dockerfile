FROM influxdb:alpine

RUN addgroup -g 1000 influx
RUN adduser -u 1000 -G influx -s /bin/sh -D influx

USER influx
