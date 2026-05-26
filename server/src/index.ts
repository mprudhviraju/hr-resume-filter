import dotenv from 'dotenv';
import { app } from './app';

dotenv.config();

const DEV_DEFAULT_PORT = 8787;
const PORT = Number(process.env.PORT) || DEV_DEFAULT_PORT;

console.log('=== Server Starting ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('JOB_TABLE_NAME:', process.env.JOB_TABLE_NAME || '(in-memory)');
console.log('PORT:', PORT);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('Server start failed:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
