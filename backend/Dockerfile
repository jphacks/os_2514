FROM node:20-alpine
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /appdocker build -t backend-service .

COPY . .

RUN npm install --omit=dev

EXPOSE 8080

CMD ["node", "server.js"]