FROM node:20-alpine
WORKDIR /app
COPY order-service/package*.json ./
RUN npm install --omit=dev
COPY proto ./proto
COPY order-service/server.js ./
EXPOSE 4000
CMD ["npm", "start"]
