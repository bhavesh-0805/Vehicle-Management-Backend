require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const maintenanceRoutes = require('./routes/maintenance');
const fuelRoutes = require('./routes/fuellogs');
const parkingRoutes = require('./routes/parking');

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "https://vocal-rabanadas-3b3af5.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS: Not allowed"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

connectDB(process.env.MONGO_URI);

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/parking', parkingRoutes);

app.get('/api/analytics/:vehicleId', (req, res) => {
  const data = {
    vehicleId: req.params.vehicleId,
    score: Math.floor(70 + Math.random() * 30),
    mileage: Math.floor(12 + Math.random() * 5),
    efficiency: Math.floor(60 + Math.random() * 30)
  };
  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
