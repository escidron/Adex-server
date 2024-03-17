// logger.js
import winston from 'winston';
const { combine, timestamp, label, printf } = winston.format;

const myFormat = printf(({ level, message, label, timestamp, userId, endpoint }) => {
  return `${timestamp} [${label}] ${level}: ${message} [UserID: ${userId}] [Endpoint: ${endpoint}]`;
});

const logger = winston.createLogger({
  level: 'error', 
  format: combine(
    label({ label: 'Errors' }),
    timestamp(),
    myFormat
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      label({ label: 'Errors' }),
      timestamp(),
      myFormat
    ),
  }));
}

export default logger;
