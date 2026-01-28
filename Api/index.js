import express from 'express';
import cors from 'cors';

import "./src/config/db.config.js"

import usersRouter from './src/routes/Users.js';
import rolesRouter from './src/routes/Roles.js';
import pagesRouter from './src/routes/Pages.js';
import productsRouter from './src/routes/Products.js';
import salesRouter from './src/routes/Sales.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/v1/users', usersRouter);
app.use('/v1/roles', rolesRouter);
app.use("/v1/pages", pagesRouter);
app.use("/v1/products", productsRouter);
app.use("/v1/sales", salesRouter);

app.get('/', (req, res) => {
  res.send('API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});