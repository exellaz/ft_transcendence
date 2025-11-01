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

// Start server
// const start = async () => {
//   try {
//     await app.listen({ port: 3000, host: "0.0.0.0" });
//     console.log("🚀 Server runnning at http://localhost:3000");
//   } catch (err) {
//     app.log.error(err);
//     process.exit(1);
//   }
// };
// start();
