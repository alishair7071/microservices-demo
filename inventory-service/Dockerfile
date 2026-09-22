FROM node:20-alpine
WORKDIR /app
COPY inventory-service/package*.json ./
RUN npm install --omit=dev
COPY proto ./proto
COPY inventory-service ./
EXPOSE 4001
EXPOSE 50051
CMD ["npm", "start"]
