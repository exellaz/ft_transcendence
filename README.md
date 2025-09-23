# ft_transcendence

## Project Setup


#### 1️⃣ Environment Variables

Both the **frontend/** and **backend/** require `.env` files.
You’ll find `.env.example` files already created in each folder.

From the project root:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

#### 2️⃣ Database Seeding

```bash
# Install dependencies if not already
npm install

# Run migrations (creates/updates the database schema)
npx prisma migrate dev --name init

# Run the seed script
npx prisma db seed
```
- wipe the existing users table,
- Reset the autoincrement counter,
- Insert initial users (see prisma/seed.ts for details).


## View and edit database visually using Prisma Studio.
```
npx prisma studio
```

Then open your browser at http://localhost:5555
