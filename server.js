import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';

const app = express();
const PORT = process.env.PORT || 3000
connectDB();
connectCloudinary();

app.use(express.static('public'))
app.use(express.json());
app.use(cors());

app.use('/api/admin', adminRouter)
app.use('/api/doctor', doctorRouter)
app.use('/api/user', userRouter)

app.listen(PORT, ()=> {
    console.log("Server Started on PORT:",PORT);    
});