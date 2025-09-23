// schemas/userSchemas.ts

export const getUserByIdSchema = {
	params: {
	  type: "object",
	  properties: {
			id: { type: "integer", minimum: 1 }
	  },
	  required: ["id"]
	},

	response: {
	  200: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				data: {
					type: "object",
					properties: {
						id: { type: "integer" },
						username: { type: "string" },
						email: { type: "string" },
						avatarUrl: { type: ["string", "null"] },
						usercode: { type: "string" },
						status: { type: "string" }, // could refine with enum if you want
						joinedAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" }
					},
					required: [
						"id",
						"username",
						"email",
						"avatarUrl",
						"usercode",
						"status",
						"joinedAt",
						"updatedAt"
					]
				}
			},
			required: ["success", "data"]
	  },
	  404: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				error: { type: "string" }
			},
			required: ["success", "error"]
		},
		400: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				error:   { type: "string" }
			},
			required: ["success", "error"]
		}
	}
};

export const patchUserByIdSchema = {
	params: {
	  type: "object",
	  properties: {
			id: { type: "integer", minimum: 1 }
	  },
	  required: ["id"]
	}
}

// DELETE user
export const deleteUserByIdSchema = {
	params: {
	  type: "object",
	  properties: {
			id: { type: "integer", minimum: 1 }
	  },
	  required: ["id"]
	}
}

// GET /users/:id/settings
export const getUserSettingsByIdSchema = {
	params: {
	  type: "object",
	  properties: {
			id: { type: "integer", minimum: 1 }
	  },
	  required: ["id"]
	}
}

// PATCH /users/:id/settings  (update single user settings)
export const patchUserSettingsByIdSchema = {
	params: {
		type: "object",
		properties: {
			id: { type: "integer", minimum: 1 }
		},
		required: ["id"]
	}
}
