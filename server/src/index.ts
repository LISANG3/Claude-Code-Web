import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authRouter, initDefaultUser } from './auth.js';
import { filesRouter } from './files.js';
import { handleConnection } from './ws-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

initDefaultUser();

const app = express();
const server = createServer(app);

app.use(cors());
app.disable('x-powered-by');
app.use(express.json());

const clientDist = join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.use('/api', authRouter);
app.use('/api/files', filesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', handleConnection);

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Claude Code Web running on http://0.0.0.0:${PORT}`);
});
