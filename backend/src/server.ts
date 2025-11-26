import app from "./app";

const startServer = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const host = process.env.HOST || "0.0.0.0";

    await app.listen({ port, host });

    console.log(`🚀 HTTP Server running at http://backend:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

startServer();
