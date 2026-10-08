import express from 'express';
import cors from 'cors';
import { deals } from './data.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/deals', (req, res) => {
  const withDiscount = deals.map((deal) => ({
    ...deal,
    discount: Math.round((1 - deal.salePrice / deal.price) * 100),
  }));
  res.json(withDiscount);
});
