import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { EdgeAgentController } from './controllers/EdgeAgentController';
import { dbConnection } from './config/veramo';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CLOUD_AGENT_URL = process.env.CLOUD_AGENT_URL || 'http://localhost:3002';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection
dbConnection.initialize().then(() => {
  console.log('Database connection initialized');
}).catch((error) => {
  console.error('Database connection failed:', error);
});

// Initialize controller
const edgeController = new EdgeAgentController(CLOUD_AGENT_URL);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Edge Agent' });
});

// DID Management Routes
app.post('/api/did/create', edgeController.createDID);
app.get('/api/did/list', edgeController.getDIDs);
app.get('/api/did/resolve/:did', edgeController.resolveDID);

// Credential Management Routes
app.post('/api/credentials/issue', edgeController.issueCredential);
app.post('/api/credentials/verify', edgeController.verifyCredential);
app.post('/api/credentials/revoke/:credentialId', edgeController.revokeCredential);
app.get('/api/credentials/holder/:holderDid', edgeController.getCredentials);

// Presentation Routes
app.post('/api/presentations/create', edgeController.createPresentation);
app.post('/api/presentations/verify', edgeController.verifyPresentation);

// QR Code Routes
app.post('/api/qr/credential-offer', edgeController.generateCredentialOfferQR);
app.post('/api/qr/presentation-request', edgeController.generatePresentationRequestQR);
app.post('/api/qr/process', edgeController.processQRCode);

// Notification Routes
app.get('/api/notifications/:did', edgeController.getNotifications);
app.post('/api/notifications/process', edgeController.processNotification);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Edge Agent running on port ${PORT}`);
  console.log(`Cloud Agent URL: ${CLOUD_AGENT_URL}`);
});