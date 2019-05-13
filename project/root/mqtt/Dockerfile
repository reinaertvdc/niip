FROM erlio/docker-vernemq

USER root

RUN mkdir /cert

COPY cert/ca.pem /cert/ca.pem
COPY cert/cert.pem /cert/cert.pem
COPY cert/key.pem /cert/key.pem

RUN chown -R vernemq:vernemq /cert
RUN chmod -R 700 /cert
RUN chmod 600 /cert/*.pem

ENV DOCKER_VERNEMQ_listener.ssl.cafile=/cert/ca.pem
ENV DOCKER_VERNEMQ_listener.ssl.certfile=/cert/cert.pem
ENV DOCKER_VERNEMQ_listener.ssl.keyfile=/cert/key.pem
ENV DOCKER_VERNEMQ_listener.ssl.default=0.0.0.0:8883
ENV DOCKER_VERNEMQ_plugins.vmq_passwd=off
ENV DOCKER_VERNEMQ_plugins.vmq_acl=off
ENV DOCKER_VERNEMQ_plugins.vmq_diversity=on
ENV DOCKER_VERNEMQ_vmq_diversity.auth_postgres.enabled=on
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.host=postgres
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.port=5432
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.user=logitrack
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.password=logitrack
ENV DOCKER_VERNEMQ_vmq_diversity.postgres.database=logitrack

USER vernemq
