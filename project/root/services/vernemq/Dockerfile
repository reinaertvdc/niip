FROM erlio/docker-vernemq:latest-alpine

USER root

RUN mkdir /cert

COPY logitrack.tk/fullchain.pem /cert/fullchain.pem
COPY logitrack.tk/cert.pem /cert/cert.pem
COPY logitrack.tk/privkey.pem /cert/privkey.pem

RUN chown -R vernemq:vernemq /cert
RUN chmod -R 700 /cert
RUN chmod 600 /cert/*.pem

ENV DOCKER_VERNEMQ_listener.ssl.default=0.0.0.0:8883
ENV DOCKER_VERNEMQ_listener.ssl.cafile=/cert/fullchain.pem
ENV DOCKER_VERNEMQ_listener.ssl.certfile=/cert/cert.pem
ENV DOCKER_VERNEMQ_listener.ssl.keyfile=/cert/privkey.pem

ENV DOCKER_VERNEMQ_plugins.vmq_passwd=off
ENV DOCKER_VERNEMQ_plugins.vmq_acl=off
ENV DOCKER_VERNEMQ_plugins.vmq_diversity=on
ENV DOCKER_VERNEMQ_vmq_diversity.auth_postgres.enabled=on
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.host=db
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.port=5432
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.user=postgres
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.password=tow0Pw7DBPcBeLlykSIozWLK
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.database=postgres

USER vernemq
