export const successResponseSchema = (dataSchema: any) => ({
  type: "object",
  properties: {
    success: { type: "boolean", const: true },
    data: dataSchema,
  },
  required: ["success", "data"],
  additionalProperties: false,
});

export const errorResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", const: false },
    error: { type: "string" },
    errorCode: { type: "string" },
  },
  required: ["success", "error", "errorCode"],
  additionalProperties: false,
};
