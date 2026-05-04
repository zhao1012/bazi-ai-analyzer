import express from 'express';
import cors from 'cors';
import { baziRouter } from './routes/bazi.js';
import configRouter from './routes/config.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/bazi', baziRouter);
app.use('/api', configRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Bazi AI Analyzer Server running on http://localhost:${PORT}`);
});