FROM node:alpine

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install --only=prod

USER node

CMD [ "node_modules/.bin/ts-node", "src/index.ts" ]
