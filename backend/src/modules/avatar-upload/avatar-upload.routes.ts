import { FastifyInstance } from "fastify";
import path from 'path';
import { uploadsDir } from "../../plugins/avatar-upload";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";


async function avatarUploadRoutes(fastify: FastifyInstance) {
    
  fastify.post('/upload-avatar', async (request, reply) => {
    const data = await request.file();
  
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
      
    }
  
    const filename = data.filename;
    const filepath = path.join(uploadsDir, filename);
  
    try {
      await pipeline(data.file, createWriteStream(filepath));
  
      return {
        success: true,
        filename: filename,
        mimetype: data.mimetype,
        encoding: data.encoding,
        path: filepath
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to save file' });
    }
  });

}

export default avatarUploadRoutes;