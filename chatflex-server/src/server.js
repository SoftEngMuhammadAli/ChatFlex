require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const createNoopIo = () => ({
  to() {
    return {
      emit() {}
    };
  },
  on() {}
});

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  let io = createNoopIo();
  try {
    const { Server } = require("socket.io");
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "*"
      }
    });

    io.on("connection", (socket) => {
      const workspaceId = socket.handshake.query.workspaceId;
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Socket.IO disabled due to dependency issue:", error.message);
  }

  app.set("io", io);

  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`ChatFlex server running on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
