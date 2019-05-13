FROM erlio/docker-vernemq

USER root

RUN mkdir /cert

COPY cert/ca.pem /cert/ca.pem
COPY cert/cert.pem /cert/cert.pem
COPY cert/key.pem /cert/key.pem

RUN chown -R vernemq:vernemq /cert
RUN chmod -R 700 /cert
RUN chmod 600 /cert/*.pem

ENV DOCKER_VERNEMQ_USER_test=test
ENV DOCKER_VERNEMQ_listener.ssl.cafile=/cert/ca.pem
ENV DOCKER_VERNEMQ_listener.ssl.certfile=/cert/cert.pem
ENV DOCKER_VERNEMQ_listener.ssl.keyfile=/cert/key.pem
ENV DOCKER_VERNEMQ_listener.ssl.default=0.0.0.0:8883

USER vernemq
