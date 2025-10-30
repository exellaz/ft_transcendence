import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FastifyInstance } from "fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const assetsDir = path.join(__dirname, "../../public/assets");

async function assetsStaticPlugin(fastify: FastifyInstance) {
  await fs.mkdir(assetsDir, { recursive: true });
  console.log(
    `[assets static] Ensured assets directory exists at ${assetsDir}`,
  );
  fastify.register(fastifyStatic, {
    root: assetsDir,
    prefix: "/assets/",
    decorateReply: false, // needed
  });
}

export default fp(assetsStaticPlugin);
