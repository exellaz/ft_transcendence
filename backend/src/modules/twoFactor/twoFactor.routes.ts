import { FastifyInstance } from "fastify";
import { TwoFactorService } from "./twoFactor.service";
import { authenticate } from "src/plugins/authenticate";
import { ApiError, ok } from "src/utils/response";
import { generateAuthToken } from "../users/users.service";
import { userPublicSelect } from "../users/users.select";
import { verifyPassword } from "../users/users.service";

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
      return ok({ qrUri: qrCodeDataUri, secret });
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

  fastify.get(
    "/auth/two-factor/status",
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

      return ok({ twoFactorEnabled: user.twoFactorEnabled });
    },
  );

  fastify.post(
    "/auth/two-factor/verify",
    {
      schema: {
        tags: ["auth"],
        body: {
          type: "object",
          properties: {
            identifier: { type: "string", minLength: 1 },
            password: { type: "string", minLength: 1 },
            twoFactorCode: { type: "string", minLength: 6, maxLength: 6 },
          },
          required: ["identifier", "password", "twoFactorCode"],
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const { identifier, password, twoFactorCode } = request.body as {
        identifier: string;
        password: string;
        twoFactorCode: string;
      };

      // Find user
      const user = await fastify.db.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase().trim() },
            { username: identifier.trim() },
          ],
        },
        select: {
          ...userPublicSelect,
          password: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
        },
      });

      if (!user || !user.password) {
        throw ApiError.unauthorized(
          "Invalid credentials",
          "INVALID_CREDENTIALS",
        );
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw ApiError.unauthorized(
          "Invalid credentials",
          "INVALID_CREDENTIALS",
        );
      }

      // Verify 2FA is enabled
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw ApiError.badRequest(
          "Two-factor authentication not enabled",
          "TWO_FACTOR_NOT_ENABLED",
        );
      }

      // Verify 2FA code
      const isValid2FA = TwoFactorService.verifyToken(
        twoFactorCode,
        user.twoFactorSecret,
      );
      if (!isValid2FA) {
        throw ApiError.unauthorized(
          "Invalid two-factor authentication token",
          "INVALID_TWO_FACTOR_TOKEN",
        );
      }

      // Remove sensitive data
      const { ...userWithoutSensitive } = user;

      // Generate token and update last login
      const token = generateAuthToken(user.id, user.email);

      request.log.info(`2FA verification successful for user: ${user.email}`);

      return ok({
        token,
        user: userWithoutSensitive,
      });
    },
  );
}
