FROM node:20-alpine
WORKDIR /app
COPY resilience-lab-service/package*.json ./
RUN npm ci --omit=dev
COPY shared/consul-registration.js ./consul-registration.js
COPY shared/correlated-logger.js ./correlated-logger.js
COPY resilience-lab-service ./
ENV OTEL_SERVICE_NAME=resilience-lab-service \
    OTEL_TRACES_EXPORTER=otlp \
    OTEL_METRICS_EXPORTER=none \
    OTEL_LOGS_EXPORTER=none \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://host.docker.internal:4318/v1/traces \
    OTEL_NODE_ENABLED_INSTRUMENTATIONS=http,express,undici,mongodb
EXPOSE 4020
CMD ["npm", "start"]
