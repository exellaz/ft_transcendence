import app from "./app";

const startServer = async () => {
  try {
    const port = 3000;
    const host = "0.0.0.0";
    const httpsEnabled = process.env.HTTPS_ENABLED === "true";

    await app.listen({ port, host });

    if (httpsEnabled) {
      console.log(`🚀 HTTPS Server running at https://localhost:${port}`);
    } else {
      console.log(`🚀 HTTP Server running at http://localhost:${port}`);
    }
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

startServer();
