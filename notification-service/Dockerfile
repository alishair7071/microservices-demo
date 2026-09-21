FROM node:20-alpine
WORKDIR /app
COPY notification-service/package*.json ./
RUN npm install --omit=dev
COPY notification-service/server.js ./
EXPOSE 4004
CMD ["npm", "start"]
