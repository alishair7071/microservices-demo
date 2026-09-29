FROM node:20-alpine
WORKDIR /app
COPY inventory-service/package*.json ./
RUN npm install --omit=dev
COPY shared/consul-registration.js ./consul-registration.js
COPY proto ./proto
COPY inventory-service ./
EXPOSE 4001
EXPOSE 50051
CMD ["npm", "start"]
