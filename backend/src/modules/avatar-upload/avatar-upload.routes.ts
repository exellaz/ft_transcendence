import { FastifyInstance } from "fastify";
import path from 'path';
import { uploadsDir } from "../../plugins/avatar-upload";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { ApiError, ok } from "src/utils/response";
import { Prisma } from "@prisma/client";
import { userPublicSelect } from "../users/users.select";


async function avatarUploadRoutes(fastify: FastifyInstance) {
    
  // upload avatar 
  fastify.patch('/users/:id/avatar', async (request, reply) => {

    // get userId from param
    const { id } = request.params as { id: string };
    const userId = Number(id);
    // TODO: check if the user is uploading avatar for themselves

    const data = await request.file();
    if (!data)
      throw ApiError.badRequest('No file uploaded', 'NO_FILE_UPLOADED');
  
    const filename = data.filename;
  
    try {
      // upload file to Server /uploads/avatars
      uploadFileToServerUploadsDir(data.file, filename);
      
      // save relative filepath of avatar image to user's avatarUrl in database
      const updatedUser = await fastify.db.user.update({
        where: { id: userId },
        data: { avatarUrl: `/uploads/avatars/${filename}` },
        select: userPublicSelect
      });

      return ok(updatedUser);
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025")
          throw ApiError.notFound("User not found", "USER_NOT_FOUND");
      }

      throw err; // let Fastify handle other errors
    }
  });

}


async function uploadFileToServerUploadsDir(file: any, filename: string) {
  const filepath = path.join(uploadsDir, filename);
  try {
    await pipeline(file, createWriteStream(filepath));
    console.log(`[avatar upload] Saved uploaded avatar file to ${filepath}`);
  } catch (err) {
    throw ApiError.internal('Failed to save file', 'FILE_SAVE_ERROR');
  }


}


export default avatarUploadRoutes;