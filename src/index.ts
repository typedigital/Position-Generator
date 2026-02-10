import { startServer } from './server/server.js';
import { fileURLToPath } from 'url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
    startServer();
}