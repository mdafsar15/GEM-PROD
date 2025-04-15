const express = require('express');
const adoptionRoutes = require('./adoption/routes');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/adoption', adoptionRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Cow Adoption API is running');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://165.22.213.239:${PORT}`);
});