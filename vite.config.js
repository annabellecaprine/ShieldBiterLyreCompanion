import { defineConfig } from 'vite';

// Use relative paths so the build works both on GitHub Pages
// (served from /ShieldBiterLyreCompanion/) and inside a Capacitor
// Android WebView (served from local file:// or capacitor://).
export default defineConfig({
    base: './',
});
