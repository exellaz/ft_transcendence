FROM node:latest

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 4242
CMD ["npm", "run", "dev"]
