FROM node:22

WORKDIR /app

# copy first to let Docker cache dependencies separately
COPY package.json package-lock.json* ./

RUN npm install

COPY . .
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/entrypoint.sh

EXPOSE 3000
# Creates a new migration file if schema and DB differ.
# Applies the migration to the database('app.db')
# Create 'app.db' file if doesn't exist
# Runs prisma generate (so your Prisma Client is updated).
ENTRYPOINT [ "./scripts/entrypoint.sh" ]
CMD ["npm", "run", "dev"]
