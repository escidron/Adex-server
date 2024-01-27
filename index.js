import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import advertisementRoutes from "./routes/advertisementRoutes.js";
import listPropertyRoutes from "./routes/listPropertyRoutes.js";
import PaymentsRoutes from "./routes/PaymentsRoutes.js";
import schedule from 'node-schedule';

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { updateFinishedListingAndContract } from "./queries/Payments.js";
import { sendExpiredListingEmail } from "./utils/sendExpiredListingEmail.js";
import { updateExpiredListingsStatus } from "./queries/Advertisements.js";
import { publishRatings } from "./utils/publishRatings.js";
import { generateQrCode } from "./utils/generateQrCode.js";
import sendEmail from "./utils/sendEmail.js";
import renderEmail from "./utils/emailTamplates/emailTemplate.js";
import nodeHtmlToImage from "node-html-to-image";

dotenv.config();
const port = process.env.PORT || 5001;

//update the listing after contract ends (triggers every day at 12:01am)
schedule.scheduleJob('1 0 * * *', updateFinishedListingAndContract);

//send notifications email about the listing expire (triggers every day at 7am)
schedule.scheduleJob('0 7 * * *', sendExpiredListingEmail);

//update status of the expired listings (triggers every day at 12:05am)
schedule.scheduleJob('5 0 * * *', updateExpiredListingsStatus);

//send notifications email about the listing expire (triggers every day at 12:10am)//'10 0 * * *
schedule.scheduleJob('49 * * * *', publishRatings);

// const emailData = {
//   title: "ADEX Listing",
//   subTitle: "Listing  created",
//   message: "Your Listing has been successfully created ",
//   icon: "listing-created"
// };
// const emailContent = renderEmail(emailData);
// sendEmail('eduardosanchezcidron@gmail.com', "Listing Created", emailContent,"0021");

//  generateQrCode('0021')



const app = express();
app.use(express.json({ limit: "100mb" }));
const corsOptions = {
  origin: [process.env.CLIENT_IP],
  // origin: [process.env.CLIENT_IP,process.env.CLIENT_IP_MOBILE],
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
app.use('/images', express.static('D:/Projetos Front-end/2-Adex-next/adex/server/images'));

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server Started on port ${port}`));
