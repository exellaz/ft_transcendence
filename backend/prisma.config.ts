// When Prisma sees `prisma.config.ts`,
// it stops reading your .env file automatically, and it expects you to handle env loading yoursel

import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config(); // makes .env variables available

export default defineConfig({
  migrations: {
    seed: `tsx prisma/seed.ts`,
  },
});
