FROM node:20-alpine
WORKDIR /app
COPY order-service/package*.json ./
RUN npm install --omit=dev
COPY shared/consul-registration.js ./consul-registration.js
COPY proto ./proto
COPY order-service ./
EXPOSE 4000
CMD ["npm", "start"]
