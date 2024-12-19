
// server.js (Backend: Node.js + Express)
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User schema and model for authentication
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model('User', userSchema);

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({ username: req.body.username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(403).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Service schema and model
const serviceSchema = new mongoose.Schema({
  name: String,
  url: String,
  status: { type: String, default: 'unknown' },
  lastChecked: { type: Date, default: Date.now },
});
const Service = mongoose.model('Service', serviceSchema);

// Routes
// Add a new service (protected)
app.post('/api/services', authenticateToken, async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all services (protected)
app.get('/api/services', authenticateToken, async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a service (protected)
app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monitor services periodically
cron.schedule('*/5 * * * *', async () => {
  const services = await Service.find();
  for (const service of services) {
    try {
      const response = await axios.get(service.url);
      const newStatus = response.status === 200 ? 'on' : 'down';
      if (service.status !== newStatus) {
        service.status = newStatus;
        service.lastChecked = new Date();
        await service.save();
        // Send webhook notification
        if (process.env.WEBHOOK_URL) {
          axios.post(process.env.WEBHOOK_URL, {
            text: `Service ${service.name} is now ${newStatus}`,
          });
        }
      }
    } catch (error) {
      if (service.status !== 'down') {
        service.status = 'down';
        service.lastChecked = new Date();
        await service.save();
        // Send webhook notification
        if (process.env.WEBHOOK_URL) {
          axios.post(process.env.WEBHOOK_URL, {
            text: `Service ${service.name} is now down`,
          });
        }
      }
    }
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
