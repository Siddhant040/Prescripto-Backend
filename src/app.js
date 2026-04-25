import express from 'express';
import cors from 'cors';
const app = express();

//middleware configuration

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({limit:"16kb",extended:true}))
app.use(express.static("public"))



//cors configuration 
app.use(cors({
    origin: process.env.Url, // Replace with your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
}));


//importing routes
import healthCheckRoute from './modules/healthcheck/healthCheck.route.js';

app.use("/api/v1/healthCheck", healthCheckRoute)


export  default app;