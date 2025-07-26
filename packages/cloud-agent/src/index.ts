import express from 'express';
import cors from 'cors';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { WebSocketService } from './services/WebSocketService';
import { MessageRoutingService } from './services/MessageRoutingService';
import { DIDResolverService } from './services/DIDResolverService';
import { CloudAgentController } from './controllers/CloudAgentController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/cloud-agent';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/your-infura-project-id';
const DID_REGISTRY_CONTRACT = process.env.DID_REGISTRY_CONTRACT || '0x...';

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize services
const wsService = new WebSocketService(server);
const messageRouter = new MessageRoutingService(wsService);
const didResolver = new DIDResolverService(ETHEREUM_RPC_URL, DID_REGISTRY_CONTRACT);

// Initialize controller
const cloudController = new CloudAgentController(messageRouter, didResolver, wsService);

// Connect to MongoDB
mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.get('/health', cloudController.health);

// Connection management routes
app.get('/api/connections', cloudController.getConnections);
app.get('/api/connections/:did/status', cloudController.getConnectionStatus);

// Message routing routes
app.post('/api/messages/send', cloudController.sendMessage);
app.get('/api/messages/:did', cloudController.getPendingMessages);
app.post('/api/messages/:messageId/delivered', cloudController.markMessageDelivered);
app.post('/api/messages/broadcast', cloudController.broadcastMessage);
app.post('/api/notifications/send', cloudController.sendNotification);

// DID management routes
app.get('/api/did/resolve/:did', cloudController.resolveDID);
app.post('/api/did/register', cloudController.registerDID);
app.put('/api/did/:did', cloudController.updateDID);
app.delete('/api/did/:did', cloudController.revokeDID);

// Statistics and monitoring routes
app.get('/api/stats/messages', cloudController.getMessageStats);
app.get('/api/stats/blockchain', cloudController.getBlockchainStatus);
app.get('/api/messages/history', cloudController.getMessageHistory);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Cloud Agent running on port ${PORT}`);
  console.log(`MongoDB URL: ${MONGO_URL}`);
  console.log(`Ethereum RPC URL: ${ETHEREUM_RPC_URL}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});