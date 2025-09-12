import { FastifyInstance } from "fastify";


// helper to generate unique user code
export async function generateUniqueUserCode(fastify: FastifyInstance, username: string) {
	let code: string;
	let exists = true;

	console.log("Generating user code for:", username);
	while (exists) {
	  code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
	  const user = await fastify.db.user.findUnique({
		where: { usercode: code }, // compound unique
	  });
	  exists = !!user;
	}

	return code!;
  }
