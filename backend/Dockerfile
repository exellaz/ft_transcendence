FROM node:22

WORKDIR /app

# copy first to let Docker cache dependencies separately
COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Creates a new migration file if schema and DB differ.
# Applies the migration to the database('app.db')
# Create 'app.db' file if doesn't exist
# Runs prisma generate (so your Prisma Client is updated).
RUN npx prisma migrate dev --name init

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate dev && npm run dev"]

