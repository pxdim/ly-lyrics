/**
 * Custom Next.js Server with Socket.IO Support
 *
 * This file creates a custom Next.js server that integrates Socket.IO
 * for WebSocket connections. Use this instead of the default Next.js
 * dev server for development.
 *
 * Run with: npx tsx server.ts
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initWebSocketServer } from "./lib/websocket/server";

const dev = process.env["NODE_ENV"] !== "production";
const hostname = process.env["HOST"] || "localhost";
const port = parseInt(process.env["PORT"] || "3000", 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize WebSocket server
  initWebSocketServer(server);

  server
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`\n> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket server initialized`);
    });
});
