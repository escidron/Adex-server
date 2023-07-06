import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'
dotenv.config();
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import advertisementRoutes from './routes/advertisementRoutes.js'
import listPropertyRoutes from './routes/listPropertyRoutes.js'
import PaymentsRoutes from './routes/PaymentsRoutes.js'
import connectRoutes from './routes/connectRoutes.js'
const port = process.env.PORT || 5000;


const app = express();

app.use(express.json());
const corsOptions ={
    origin:["http://localhost:3000"],
    credentials:true,
    exposedHeaders :["Authorization"],
    allowedHeaders: [
        "set-cookie",
        "Content-Type",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
      ]
}
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

 app.use('/api/users', userRoutes);
 app.use('/api/advertisements', advertisementRoutes);
 app.use('/api/list-property', listPropertyRoutes);
 app.use('/api/payments', PaymentsRoutes);
 app.use('/api/stripe-connect', connectRoutes);

// if (process.env.NODE_ENV === 'production') {
//   const __dirname = path.resolve();
//   app.use(express.static(path.join(__dirname, '/frontend/dist')));

//   app.get('*', (req, res) =>
//     res.sendFile(path.resolve(__dirname, 'frontend', 'dist', 'index.html'))
//   );
// } else {
//   app.get('/', (req, res) => {
//     res.send('API is running....');
//   });
// }

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));