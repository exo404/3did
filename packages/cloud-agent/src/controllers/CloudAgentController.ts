import { Request, Response } from 'express';
import { MessageRoutingService } from '../services/MessageRoutingService';
import { DIDResolverService } from '../services/DIDResolverService';
import { WebSocketService } from '../services/WebSocketService';
import EdgeConnectionModel from '../models/EdgeConnection';
import MessageQueueModel from '../models/MessageQueue';
import { DIDCommMessage } from '../types';

export class CloudAgentController {
  private messageRouter: MessageRoutingService;
  private didResolver: DIDResolverService;
  private wsService: WebSocketService;

  constructor(
    messageRouter: MessageRoutingService,
    didResolver: DIDResolverService,
    wsService: WebSocketService
  ) {
    this.messageRouter = messageRouter;
    this.didResolver = didResolver;
    this.wsService = wsService;
  }

  // Health check endpoint
  health = async (req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'OK',
      service: 'Cloud Agent',
      connections: this.wsService.getConnectionCount(),
      timestamp: new Date().toISOString()
    });
  };

  // Get all connected edge agents
  getConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      const connections = await EdgeConnectionModel.find().sort({ lastSeen: -1 });
      res.json({ connections });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get connections' });
    }
  };

  // Get connection status for a specific DID
  getConnectionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did } = req.params;
      const connection = await EdgeConnectionModel.findOne({ did });
      
      if (connection) {
        const isActive = this.wsService.isConnectionActive(did);
        res.json({
          did,
          status: isActive ? 'online' : 'offline',
          lastSeen: connection.lastSeen,
          endpoint: connection.endpoint
        });
      } else {
        res.status(404).json({ error: 'Connection not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get connection status' });
    }
  };

  // Send DIDComm message
  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const message: DIDCommMessage = req.body;
      
      // Validate message format
      if (!message.id || !message.type || !message.to || !message.from) {
        res.status(400).json({ error: 'Invalid message format' });
        return;
      }

      await this.messageRouter.routeMessage(message);
      res.json({ message: 'Message queued for delivery', messageId: message.id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  };

  // Get pending messages for a DID
  getPendingMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did } = req.params;
      const messages = await this.messageRouter.getPendingMessages(did);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get pending messages' });
    }
  };

  // Mark message as delivered
  markMessageDelivered = async (req: Request, res: Response): Promise<void> => {
    try {
      const { messageId } = req.params;
      await this.messageRouter.markMessageDelivered(messageId);
      res.json({ message: 'Message marked as delivered' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark message as delivered' });
    }
  };

  // Resolve DID document
  resolveDID = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did } = req.params;
      
      if (!this.didResolver.validateDIDFormat(did)) {
        res.status(400).json({ error: 'Invalid DID format' });
        return;
      }

      const document = await this.didResolver.resolveDID(did);
      
      if (document) {
        res.json({ document });
      } else {
        res.status(404).json({ error: 'DID not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve DID' });
    }
  };

  // Register DID
  registerDID = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did, document } = req.body;
      
      if (!this.didResolver.validateDIDFormat(did)) {
        res.status(400).json({ error: 'Invalid DID format' });
        return;
      }

      const success = await this.didResolver.registerDID(did, document);
      
      if (success) {
        res.json({ message: 'DID registered successfully', did });
      } else {
        res.status(500).json({ error: 'Failed to register DID' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to register DID' });
    }
  };

  // Update DID document
  updateDID = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did } = req.params;
      const { document } = req.body;
      
      if (!this.didResolver.validateDIDFormat(did)) {
        res.status(400).json({ error: 'Invalid DID format' });
        return;
      }

      const success = await this.didResolver.updateDID(did, document);
      
      if (success) {
        res.json({ message: 'DID updated successfully', did });
      } else {
        res.status(500).json({ error: 'Failed to update DID' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to update DID' });
    }
  };

  // Revoke DID
  revokeDID = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did } = req.params;
      
      if (!this.didResolver.validateDIDFormat(did)) {
        res.status(400).json({ error: 'Invalid DID format' });
        return;
      }

      const success = await this.didResolver.revokeDID(did);
      
      if (success) {
        res.json({ message: 'DID revoked successfully', did });
      } else {
        res.status(500).json({ error: 'Failed to revoke DID' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke DID' });
    }
  };

  // Broadcast message to multiple DIDs
  broadcastMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { recipients, message } = req.body;
      
      if (!Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'Recipients must be a non-empty array' });
        return;
      }

      await this.messageRouter.broadcastMessage(recipients, message);
      res.json({ message: 'Broadcast message queued', recipients: recipients.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to broadcast message' });
    }
  };

  // Get message queue statistics
  getMessageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.messageRouter.getMessageStats();
      const totalConnections = await EdgeConnectionModel.countDocuments();
      const activeConnections = this.wsService.getConnectionCount();
      
      res.json({
        messageQueue: stats,
        connections: {
          total: totalConnections,
          active: activeConnections,
          offline: totalConnections - activeConnections
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get message statistics' });
    }
  };

  // Get recent message history
  getMessageHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const messages = await MessageQueueModel.find()
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset));
      
      const total = await MessageQueueModel.countDocuments();
      
      res.json({
        messages,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get message history' });
    }
  };

  // Send notification
  sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const notification = req.body;
      await this.messageRouter.sendNotification(notification);
      res.json({ message: 'Notification sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send notification' });
    }
  };

  // Get blockchain status
  getBlockchainStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentBlock = await this.didResolver.getCurrentBlock();
      res.json({
        currentBlock,
        network: 'sepolia',
        status: 'connected'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get blockchain status' });
    }
  };
}