import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import groupRoutes from "./routes/group.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import settlementRoutes from "./routes/settlement.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import exportRoutes from "./routes/export.routes.js";

import { initSocket } from "./socket.js";
import { generalLimiter, authLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();

// app.use(cors({
//   origin: process.env.FRONTEND_URL || "http://localhost:3000",
//   credentials: true,
// }));
app.use(cors({
  origin: "*"
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(generalLimiter);

app.use("/api/auth", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/export", exportRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

const server = http.createServer(app);

initSocket(server);

connectDB();

server.listen(process.env.PORT, () =>
  console.log("Server running on port:", process.env.PORT)
);
