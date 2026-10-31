import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dedicated port to avoid accidentally connecting to another Socket.IO game.
const gamePort = Number(process.env.GAME_PORT || 43171);
const target = `http://127.0.0.1:${gamePort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/socket.io': { target, ws: true },
      '/api': { target }
    }
  }
});
