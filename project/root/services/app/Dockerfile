FROM node:alpine

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install --only=prod

USER node

CMD [ "node", "src/index.js" ]
