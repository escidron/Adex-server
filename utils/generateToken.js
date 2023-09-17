import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
dotenv.config();

const generateToken = (res, userId,fullName,email) => {
  const token = jwt.sign({ userId,fullName,email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  console.log('generating token',userId)
  res.cookie('jwt', token, {
    httpOnly: false,
    secure: false, // Use secure cookies in production
    // secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
    sameSite: 'strict', // Prevent CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export default generateToken;