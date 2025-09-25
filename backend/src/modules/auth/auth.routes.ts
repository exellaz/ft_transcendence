import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../utils/response";
import { hashPassword } from "../../authService";
import { getUserByEmail, createUserWithPassword } from "../../userModel";
import jwt from "jsonwebtoken";
import { authConfig } from "../../config/authConfig";

function validateRegistrationInput(email: string, password: string, name: string) {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (name.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  }
  if (name.length > 24) {
    errors.push("Name must be at most 24 characters");
  }
  return errors;
}

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

	fastify.post("/auth/register", async (request, reply) => {
		const { email, password, name } = request.body as {
		email?: string;
		password?: string;
		name?: string;
		};

		// Basic validation
		if (!email || !password || !name) {
		throw new ApiError("Missing required fields: email, password, name", 400);
		}

		// Input validation
		const validationErrors = validateRegistrationInput(email, password, name);
		if (validationErrors.length > 0) {
		throw new ApiError(`Validation failed: ${validationErrors.join(", ")}`, 400);
		}

		// Check if user already exists
		const exists = getUserByEmail(email.toLowerCase().trim());
		if (exists) {
		throw new ApiError("Email already registered", 400);
		}

		try {
		// Create user
		const passwordHash = await hashPassword(password);
		const user = createUserWithPassword(email.toLowerCase().trim(), name.trim(), passwordHash);

		if (!user) {
			throw new ApiError("Failed to create user", 500);
		}

		// Create JWT token
		const token = jwt.sign(
			{ userId: user.id, email: user.email },
			authConfig.jwtSecret as jwt.Secret,
			{ expiresIn: authConfig.jwtExpiresIn } as jwt.SignOptions,
		);

		request.log.info(`User registered successfully: ${user.email}`);

		return ok({
			token,
			user: { id: user.id, email: user.email, name: user.name },
		});
		} catch (error) {
		if (error instanceof ApiError) throw error;
		request.log.error(error);
		throw new ApiError("Registration failed", 500);
		}
	});

}

export default authRoutes;
