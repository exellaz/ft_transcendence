FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# unsure node user has permission to create node_modules folder
RUN mkdir -p /app/node_modules && chown -R node:node /app/node_modules

USER node

CMD ["npm", "run", "dev", "--", "--host"]
