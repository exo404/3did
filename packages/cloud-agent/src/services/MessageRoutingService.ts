import { DIDCommMessage, EdgeConnection } from '../types';
import EdgeConnectionModel from '../models/EdgeConnection';
import MessageQueueModel from '../models/MessageQueue';
import { WebSocketService } from './WebSocketService';
import { v4 as uuidv4 } from 'uuid';

export class MessageRoutingService {
  private wsService: WebSocketService;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.startMessageProcessor();
  }

  // Route a DIDComm message to its destination
  async routeMessage(message: DIDCommMessage): Promise<void> {
    try {
      // Check if recipient is online
      const connection = await EdgeConnectionModel.findOne({ 
        did: message.to, 
        status: 'online' 
      });

      if (connection && this.wsService.isConnectionActive(message.to)) {
        // Send directly via WebSocket
        await this.wsService.sendToConnection(message.to, message);
      } else {
        // Queue message for later delivery
        await this.queueMessage(message);
      }
    } catch (error) {
      console.error('Error routing message:', error);
      await this.queueMessage(message);
    }
  }

  // Queue message for later delivery
  private async queueMessage(message: DIDCommMessage): Promise<void> {
    try {
      const queueItem = new MessageQueueModel({
        recipientDid: message.to,
        message,
        attempts: 0,
        status: 'pending'
      });
      await queueItem.save();
    } catch (error) {
      console.error('Error queuing message:', error);
    }
  }

  // Process queued messages
  private startMessageProcessor(): void {
    setInterval(async () => {
      await this.processQueuedMessages();
    }, 10000); // Process every 10 seconds
  }

  private async processQueuedMessages(): Promise<void> {
    try {
      const pendingMessages = await MessageQueueModel.find({
        status: 'pending',
        attempts: { $lt: this.maxRetries },
        $or: [
          { nextRetry: { $exists: false } },
          { nextRetry: { $lte: new Date() } }
        ]
      }).limit(100);

      for (const queueItem of pendingMessages) {
        try {
          const connection = await EdgeConnectionModel.findOne({
            did: queueItem.recipientDid,
            status: 'online'
          });

          if (connection && this.wsService.isConnectionActive(queueItem.recipientDid)) {
            // Try to deliver message
            await this.wsService.sendToConnection(queueItem.recipientDid, queueItem.message);
            
            // Mark as delivered
            queueItem.status = 'delivered';
            await queueItem.save();
          } else {
            // Increment attempts and set next retry
            queueItem.attempts += 1;
            if (queueItem.attempts >= this.maxRetries) {
              queueItem.status = 'failed';
            } else {
              queueItem.nextRetry = new Date(Date.now() + this.retryDelay * queueItem.attempts);
            }
            await queueItem.save();
          }
        } catch (error) {
          console.error('Error processing queued message:', error);
          queueItem.attempts += 1;
          if (queueItem.attempts >= this.maxRetries) {
            queueItem.status = 'failed';
          } else {
            queueItem.nextRetry = new Date(Date.now() + this.retryDelay * queueItem.attempts);
          }
          await queueItem.save();
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    }
  }

  // Get pending messages for a DID
  async getPendingMessages(did: string): Promise<DIDCommMessage[]> {
    try {
      const queueItems = await MessageQueueModel.find({
        recipientDid: did,
        status: 'pending'
      }).sort({ createdAt: 1 });

      return queueItems.map(item => item.message);
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return [];
    }
  }

  // Mark message as delivered
  async markMessageDelivered(messageId: string): Promise<void> {
    try {
      await MessageQueueModel.updateOne(
        { 'message.id': messageId },
        { status: 'delivered' }
      );
    } catch (error) {
      console.error('Error marking message as delivered:', error);
    }
  }

  // Send notification message
  async sendNotification(notification: any): Promise<void> {
    const message: DIDCommMessage = {
      id: uuidv4(),
      type: 'notification',
      to: notification.to,
      from: 'cloud-agent',
      body: notification,
      created_time: new Date().toISOString()
    };

    await this.routeMessage(message);
  }

  // Broadcast message to multiple recipients
  async broadcastMessage(recipients: string[], message: Omit<DIDCommMessage, 'to'>): Promise<void> {
    for (const recipient of recipients) {
      const fullMessage: DIDCommMessage = {
        ...message,
        to: recipient,
        id: uuidv4()
      };
      await this.routeMessage(fullMessage);
    }
  }

  // Get message statistics
  async getMessageStats(): Promise<any> {
    try {
      const stats = await MessageQueueModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      return stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting message stats:', error);
      return {};
    }
  }
}