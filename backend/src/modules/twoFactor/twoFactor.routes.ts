import { FastifyInstance } from "fastify";
import { TwoFactorService } from "./twoFactor.service";
import { authenticate } from "src/plugins/authenticate";
import { ApiError, ok } from "src/utils/response";

export async function twoFactorRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/auth/two-factor/qr",
    { preHandler: authenticate },
    async (request) => {
      const userId = request.user?.id || "";

      const user = await fastify.db.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user) {
        throw ApiError.notFound("User not found", "USER_NOT_FOUND");
      }

      if (user.twoFactorEnabled) {
        throw ApiError.badRequest(
          "Two-factor authentication is already enabled",
          "TWO_FACTOR_ALREADY_ENABLED",
        );
      }

      let secret = user.twoFactorSecret;
      if (!secret) {
        secret = TwoFactorService.generateSecret();
        await fastify.db.user.update({
          where: { id: userId },
          data: { twoFactorSecret: secret },
        });
      }

      const qrCodeDataUri = await TwoFactorService.generateQRCodeUri(
        request.user?.username || "user",
        secret,
      );
      return ok({ qrCode: qrCodeDataUri, secret });
    },
  );

  fastify.patch(
    "/auth/two-factor/enable",
    { preHandler: authenticate },
    async (request) => {
      const { token } = request.body as { token: string };
      const userId = request.user?.id || "";

      const user = await fastify.db.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user?.twoFactorSecret) {
        throw ApiError.notFound(
          "Two-factor secret not found. Generate QR code first.",
          "TWO_FACTOR_SECRET_NOT_FOUND",
        );
      }
      if (user.twoFactorEnabled) {
        throw ApiError.badRequest(
          "Two-factor authentication is already enabled",
          "TWO_FACTOR_ALREADY_ENABLED",
        );
      }
      if (!TwoFactorService.verifyToken(token, user.twoFactorSecret)) {
        throw ApiError.unauthorized(
          "Invalid two-factor authentication token",
          "INVALID_TWO_FACTOR_TOKEN",
        );
      }

      await fastify.db.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });

      request.log.info(
        `Two-factor authentication enabled for user: ${request.user?.username}`,
      );
      return ok({ message: "Two-factor authentication enabled successfully" });
    },
  );

  fastify.patch(
    "/auth/two-factor/disable",
    { preHandler: authenticate },
    async (request) => {
      const userId = request.user?.id || "";
      const user = await fastify.db.user.findUnique({
        where: { id: userId },
        select: { twoFactorEnabled: true },
      });

      if (!user) {
        throw ApiError.notFound("User not found", "USER_NOT_FOUND");
      }
      if (!user.twoFactorEnabled) {
        throw ApiError.badRequest(
          "Two-factor authentication is not enabled",
          "TWO_FACTOR_NOT_ENABLED",
        );
      }

      await fastify.db.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });

      request.log.info(
        `Two-factor authentication disabled for user: ${request.user?.username}`,
      );
      return ok({ message: "Two-factor authentication disabled successfully" });
    },
  );
}
