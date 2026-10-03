FROM node:20-alpine
WORKDIR /app
COPY resilience-lab-service/package*.json ./
RUN npm install --omit=dev
COPY shared/consul-registration.js ./consul-registration.js
COPY shared/manual-tracing.js ./manual-tracing.js
COPY resilience-lab-service ./
EXPOSE 4020
CMD ["npm", "start"]
