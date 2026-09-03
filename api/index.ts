import 'dotenv/config';
import { createApp } from '../src/server/app.js';

// Vercel serverless entry — every /api/* request is rewritten here (see vercel.json).
// No app.listen(): Vercel invokes this as a request handler per call. Background
// setInterval jobs (bpRoutes' startBpBackgroundJobs) are intentionally NOT started
// here — they only make sense on the persistent host in server.ts.
export default createApp();
