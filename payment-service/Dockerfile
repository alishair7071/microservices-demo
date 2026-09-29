FROM node:20-alpine
WORKDIR /app
COPY payment-service/package*.json ./
RUN npm install --omit=dev
COPY shared/consul-registration.js ./consul-registration.js
COPY payment-service ./
EXPOSE 4002
CMD ["npm", "start"]
