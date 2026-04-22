import { createServer } from "http";
import { createApp } from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { createSocketServer } from "./sockets/index.js";

async function bootstrap() {
  await connectToDatabase();

  const app = createApp();
  const server = createServer(app);
  createSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`API server listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
