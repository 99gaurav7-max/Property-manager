import express from 'express';
const app = express();
app.get('*', (req, res) => {
  res.json({ status: 'ok', path: req.path });
});
export default app;
