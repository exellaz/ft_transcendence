import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FastifyInstance } from "fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsDir = path.join(__dirname, "../../uploads/avatars");

async function avatarUploadStaticPlugin(fastify: FastifyInstance) {
  await fs.mkdir(uploadsDir, { recursive: true });

  fastify.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/avatars/",
    decorateReply: false, // needed
  });
}

export default fp(avatarUploadStaticPlugin);
