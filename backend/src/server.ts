import app from "./app";

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("🚀 Server runnning at http://localhost:3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
