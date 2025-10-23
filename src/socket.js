import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("⚡ New user connected:", socket.id);

    socket.on("joinGroup", (groupId) => {
      socket.join(groupId);
      console.log(`User ${socket.id} joined group ${groupId}`);
    });

    socket.on("expenseUpdated", (data) => {
      console.log("Expense updated:", data);
    });

    socket.on("expenseAdded", (data) => {
      console.log("Expense added:", data);
    });

    socket.on("expenseDeleted", (data) => {
      console.log("Expense deleted:", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
