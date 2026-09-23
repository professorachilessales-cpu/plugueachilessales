import { startServer } from './node_modules/next/dist/server/lib/start-server.js';

console.log('Starting Next.js Server via startServer directly in-process...');
try {
  await startServer({
    dir: process.cwd(),
    isDev: true,
    hostname: '0.0.0.0',
    port: 3000,
    allowRetry: false
  });
  console.log('Next.js dev server listening successfully on http://localhost:3000');
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
