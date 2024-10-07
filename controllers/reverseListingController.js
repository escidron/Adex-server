import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import logger from "../utils/logger.js";
import { insertReverseListing } from "../queries/ReverseListing.js";
import reverseListingNotification from "../utils/reverseListingNotification.js";

dotenv.config();

const createReverseListing = asyncHandler(async (req, res) => {
  const data = req.body;
  const token = req.cookies.jwt;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  try {
    const result = await insertReverseListing(data, userId);
    if (result){
      await reverseListingNotification(data)
    }
    res.status(200).json({
      message: "data saved successfully.",
    });
  } catch (error) {
    logger.error(error.message, {
      userId: userId,
      endpoint: "createReverseListing",
    });
    res.status(500).json({
      error: error.message,
    });
  }
});

export { createReverseListing };
