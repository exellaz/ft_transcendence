import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../utils/response";
import { postUserRegisterSchema } from "../users/users.schema";
import { hashPassword, generateAuthToken, validateRegistrationInput } from "../users/users.service";
import { userPublicSelect } from "../users/users.select";

async function authRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

	// POST /auth/login
	// DRAFT Version (without password checking)
	fastify.post("/auth/login", async (request, reply) => {

		const { username, password } = request.body as {
			username: string;
			password: string;
		};

		const user = await fastify.db.user.findUnique({
			where: { username },
		});
		if (!user) {
      // return reply.status(404).send({ error: "User not found" });
			throw new ApiError("User not found", 404);
    }
    return ok(user); // 200 OK

	});

 fastify.post("/auth/register", { schema: postUserRegisterSchema }, async (request, reply) => {
    const { email, password, username } = request.body as {
      email: string;
      password: string;
      username: string;
    };

    const validationErrors = validateRegistrationInput(email, password, username);
    if (validationErrors.length > 0) {
      throw new ApiError(`Validation failed: ${validationErrors.join(", ")}`, 400);
    }

    try {
      const existingUser = await fastify.db.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase().trim() },
            { username: username.trim() }
          ]
        }
      });

      if (existingUser) {
        throw new ApiError("Email or username already registered", 400);
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with settings
      const user = await fastify.db.user.create({
        data: {
          username: username.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          settings: { create: {} },
        },
        select: userPublicSelect
      });

      // Generate JWT token
      const token = generateAuthToken(user.id, user.email);

      request.log.info(`User registered successfully: ${user.email}`);

      return reply.status(201).send(ok({
        token,
        user
      }));

    } catch (error) {
        console.log('Caught error:', error);
        console.log('Error type:', typeof error);
        console.log('Error name:', (error as any)?.name);
        console.log('Error message:', (error as any)?.message);
        console.log('Error code:', (error as any)?.code);
        console.log('Full error:', JSON.stringify(error, null, 2));

        if (error instanceof ApiError) throw error;

        request.log.error({ error }, "Registration failed");
        throw new ApiError("Registration failed", 500);
    }
  });

}

export default authRoutes;
