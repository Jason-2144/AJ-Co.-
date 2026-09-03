import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/server/app';
import { startBpBackgroundJobs } from './src/services/beautifulPostman/bpRoutes';

async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;

  // setInterval-based polling — only meaningful on a persistent host, not on
  // Vercel's per-request serverless functions (see api/index.ts).
  startBpBackgroundJobs();

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
