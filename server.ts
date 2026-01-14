import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // 初始化 Socket.io
  const io = new Server(httpServer, {
    path: "/api/socket/io", // 指定路径，避免冲突
    addTrailingSlash: false,
    cors: {
      origin: "*", // 允许跨域 (生产环境建议限制)
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Web3 Client Connected:", socket.id);

    // 1. 加入房间 (基于订单 ID)
    socket.on("join_room", (orderId) => {
      socket.join(orderId);
      console.log(`User ${socket.id} joined room: ${orderId}`);
    });

    // 2. 发送消息
    socket.on("send_message", async (data) => {
      // data: { orderId, content, senderId, senderAddress }
      const { orderId, content, senderId } = data;

      try {
        // A. 存入数据库
        const message = await prisma.message.create({
          data: {
            content,
            orderId,
            senderId,
          },
          include: {
            sender: {
              select: { walletAddress: true, nickname: true, avatar: true }
            }
          }
        });

        // B. 广播给房间内的所有人 (包括自己)
        io.to(orderId).emit("new_message", message);
        console.log(`Message sent in ${orderId}: ${content}`);

      } catch (error) {
        console.error("Message save failed:", error);
        socket.emit("error", { message: "Failed to save message" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client Disconnected:", socket.id);
    });
  });

  // 启动端口 (默认 3000)
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.io ready on path: /api/socket/io`);
  });
});
