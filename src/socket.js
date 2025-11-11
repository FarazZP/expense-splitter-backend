import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.model.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  // Authenticate socket connections using JWT
  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token
        || (socket.handshake.headers?.authorization?.startsWith("Bearer ")
          ? socket.handshake.headers.authorization.split(" ")[1]
          : undefined);

      if (!authToken) {
        return next(new Error("Unauthorized: No token provided"));
      }

      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return next(new Error("Unauthorized: User not found"));
      }

      socket.user = user;
      // Join a personal room for targeted events
      socket.join(user._id.toString());
      return next();
    } catch (err) {
      return next(new Error("Unauthorized: Invalid token"));
    }
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
