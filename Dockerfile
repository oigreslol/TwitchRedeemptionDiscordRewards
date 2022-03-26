FROM node:16.13.2

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 8080

ENTRYPOINT ["node", "index.js"]
