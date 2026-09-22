FROM node:20-alpine
WORKDIR /app
COPY email-service/package*.json ./
RUN npm install --omit=dev
COPY email-service ./
EXPOSE 4003
CMD ["npm", "start"]
