import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import advertisementRoutes from "./routes/advertisementRoutes.js";
import listPropertyRoutes from "./routes/listPropertyRoutes.js";
import PaymentsRoutes from "./routes/PaymentsRoutes.js";
import { Server } from "socket.io";
import { insertUserNotifications } from "./queries/Users.js";
dotenv.config();
const port = process.env.PORT || 5001;

const io = new Server({
  cors: {
    origin: process.env.CLIENT_IP,
  },
});

io.on("connection", (socket) => {
  socket.on("send-buyer-message", (data) => {
    const createdAt = new Date();
    const formattedCreatedAt = createdAt
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    insertMessages(data, formattedCreatedAt);
    socket.broadcast.emit("resend-data", data);

    insertUserNotifications(
      data.seller_id,
      "You have a new message",
      data.message,
      formattedCreatedAt,
      `/messages?key=${data.advertisement_id}${data.seller_id}${data.buyer_id}`,
      `${data.advertisement_id}${data.seller_id}${data.buyer_id}`
    );
    socket.broadcast.emit("resend-data", data);
  });

  socket.on("send-message", (data) => {
    const createdAt = new Date();
    const formattedCreatedAt = createdAt
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    insertMessages(data, formattedCreatedAt);
    const messageQuery = `
    INSERT INTO messages (
      sended_by,
      seller_id,
      buyer_id,
      advertisement_id,
      message,
      created_at
    ) VALUES (
      '${data.sended_by}',
      '${data.seller_id}',
      '${data.buyer_id}',
      '${data.advertisement_id}',
      '${data.message}',
      '${formattedCreatedAt}'
    )
  `;

    socket.broadcast.emit("resend-data", data);

    insertUserNotifications(
      data.seller_id,
      "You have a new message",
      data.message,
      formattedCreatedAt,
      `/messages?key=${data.advertisement_id}${data.seller_id}${data.buyer_id}`,
      `${data.advertisement_id}${data.seller_id}${data.buyer_id}`
    );
    socket.broadcast.emit("resend-data", data);
  });

  socket.on("disconnect", () => {
    console.log("disconnect");
  });
});

io.listen(4400);

const app = express();
app.use(express.json({ limit: "100mb" }));
const corsOptions = {
  origin: process.env.CLIENT_IP,
  credentials: true,
  exposedHeaders: ["Authorization"],
  allowedHeaders: [
    "set-cookie",
    "Content-Type",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
  ],
};
app.use(cors(corsOptions));

app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

app.use("/api/users", userRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/list-property", listPropertyRoutes);
app.use("/api/payments", PaymentsRoutes);
// app.use("/api/stripe-connect", connectRoutes);

app.use(notFound);
app.use(errorHandler);

// const options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem')
// }

// https.createServer(options, app).listen(port, console.log(`server https runs on port ${port}`))

app.listen(port, () => console.log(`Server Started on port ${port}`));
