import pkg from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { verifyGoogleIdToken } from './authService.ts';

const Fastify = pkg;
type FastifyReply = import('fastify').FastifyReply;
type FastifyRequest = import('fastify').FastifyRequest;

dotenv.config();

const server = Fastify({ logger: true });

server.register(cors, {
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
});

server.get('/health', async () => ({ status: 'ok' }));

server.post(
  '/auth/google',
  async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { idToken?: string };
    const idToken = body?.idToken;

    if (!idToken) {
      return reply.code(400).send({ error: 'idToken is required' });
    }

    try {
      const payload = await verifyGoogleIdToken(idToken);
      return reply.send({ ok: true, payload });
    } catch (err) {
      if (err instanceof Error) {
        request.log.error(err.message);
      } else {
        request.log.error('Unknown error', err);
      }
      return reply.code(401).send({ error: 'Invalid Google ID token' });
    }
  }
);

const PORT = Number(process.env.PORT || 4000);

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on ${PORT}`);
  } catch (err) {
    if (err instanceof Error) {
      server.log.error(err.message);
    }
    process.exit(1);
  }
};

start();
