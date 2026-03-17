import { io } from "socket.io-client";

const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SOCKET_URL = VITE_API_URL.replace("/api/v1", "");

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: true,
});

export default socket;
