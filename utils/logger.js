// logger.js
import winston from 'winston';
const { combine, timestamp, label, printf } = winston.format;

// Formato personalizado para o logger
const myFormat = printf(({ level, message, label, timestamp, userId, endpoint }) => {
  return `${timestamp} [${label}] ${level}: ${message} [UserID: ${userId}] [Endpoint: ${endpoint}]`;
});

// Cria um novo logger com configurações personalizadas
const logger = winston.createLogger({
  level: 'error', // Define o nível de log para 'error' para capturar apenas erros
  format: combine(
    label({ label: 'Errors' }),
    timestamp(),
    myFormat
  ),
  transports: [
    // Adiciona um transporte para salvar logs de erro em um arquivo
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

// Se estiver em ambiente de desenvolvimento, também exiba os logs no console
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
