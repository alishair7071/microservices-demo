FROM node:20-alpine
WORKDIR /app
COPY resilience-lab-service/package*.json ./
RUN npm install --omit=dev
COPY resilience-lab-service ./
EXPOSE 4020
CMD ["npm", "start"]
