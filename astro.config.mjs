// @ts-check
import { defineConfig } from 'astro/config';

// En ligne, GitHub Actions fournit l'adresse du site (SITE) et le sous-dossier (BASE_PATH),
// par exemple https://mon-compte.github.io et /recettes-claire.
export default defineConfig({
  site: process.env.SITE || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
