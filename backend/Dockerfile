FROM node:22

WORKDIR /app

COPY package.json package-lock.json* ./
# copy first to let Docker cache dependencies separately

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

