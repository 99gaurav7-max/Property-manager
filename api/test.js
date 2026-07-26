import express from 'express';
const app = express();
app.get('*', (req, res) => {
  res.json({ status: 'ok', source: 'test.js', path: req.path });
});
export default app;
