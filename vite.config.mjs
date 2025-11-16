import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BURASI ÖNEMLİ: GitHub repo adın ne ise onu yaz
// Örnek: repo adın "replikk" ise base: '/replikk/'
export default defineConfig({
  plugins: [react()],
  base: '/Replikk/', // <-- REPO_ADIN yerine GitHub'daki repo ismini yaz
  build: {
    outDir: 'dist'
  }
});