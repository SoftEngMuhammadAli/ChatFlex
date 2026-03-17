import {
  handleJoin,
  handleSetPresenceStatus,
  handleDisconnect,
} from "./sockets/handlers/presenceHandler.js";
import {
  handleTypingStart,
  handleTypingStop,
} from "./sockets/handlers/typingHandler.js";
import {
  handleWidgetMessage,
  handlePrivateMessage,
  handleMarkThreadRead,
  handleEditMessage,
  handleDeleteMessage,
} from "./sockets/handlers/messageHandler.js";

export const setupSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join", (payload) => handleJoin(io, socket, payload));
    socket.on("set_presence_status", (payload) =>
      handleSetPresenceStatus(io, socket, payload),
    );
    socket.on("typing_start", (payload) =>
      handleTypingStart(io, socket, payload),
    );
    socket.on("typing_stop", (payload) =>
      handleTypingStop(io, socket, payload),
    );
    socket.on("widget_message", (payload) =>
      handleWidgetMessage(io, socket, payload),
    );
    socket.on("private_message", (payload) =>
      handlePrivateMessage(io, socket, payload),
    );
    socket.on("mark_thread_read", (payload) =>
      handleMarkThreadRead(io, socket, payload),
    );
    socket.on("edit_message", (payload) =>
      handleEditMessage(io, socket, payload),
    );
    socket.on("delete_message", (payload) =>
      handleDeleteMessage(io, socket, payload),
    );
    socket.on("disconnect", () => handleDisconnect(io, socket));
  });
};
