import { spawn } from 'node:child_process';

console.log('🚀 Starting Echoes Sanctuary (MySQL API Server + Vite Frontend)...\n');

const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true
});

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

function handleExit() {
  try {
    server.kill();
    vite.kill();
  } catch (e) {}
  process.exit();
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
