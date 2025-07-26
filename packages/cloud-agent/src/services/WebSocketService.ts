import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import EdgeConnectionModel from '../models/EdgeConnection';
import { DIDCommMessage } from '../types';

export class WebSocketService {
  private wss: WebSocket.Server;
  private connections: Map<string, WebSocket> = new Map(); // DID -> WebSocket
  private didConnections: Map<WebSocket, string> = new Map(); // WebSocket -> DID

  constructor(server: any) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection');

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', async () => {
        const did = this.didConnections.get(ws);
        if (did) {
          console.log(`WebSocket connection closed for DID: ${did}`);
          await this.handleDisconnection(did);
          this.connections.delete(did);
          this.didConnections.delete(ws);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to Cloud Agent'
      }));
    });
  }

  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
    switch (message.type) {
      case 'register_did':
        await this.handleDIDRegistration(ws, message.did);
        break;
      
      case 'didcomm_message':
        await this.handleDIDCommMessage(message.message);
        break;
      
      case 'notification':
        await this.handleNotification(message.notification);
        break;
      
      case 'message_processed':
        await this.handleMessageProcessed(message.messageId);
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async handleDIDRegistration(ws: WebSocket, did: string): Promise<void> {
    try {
      // Register the connection
      this.connections.set(did, ws);
      this.didConnections.set(ws, did);

      // Update database
      await EdgeConnectionModel.findOneAndUpdate(
        { did },
        {
          did,
          endpoint: 'websocket',
          lastSeen: new Date(),
          status: 'online'
        },
        { upsert: true, new: true }
      );

      console.log(`DID registered: ${did}`);
      ws.send(JSON.stringify({
        type: 'registration_success',
        did,
        message: 'DID registered successfully'
      }));

      // Send any pending messages
      await this.deliverPendingMessages(did);
    } catch (error) {
      console.error('Error registering DID:', error);
      ws.send(JSON.stringify({
        type: 'registration_error',
        error: 'Failed to register DID'
      }));
    }
  }

  private async handleDIDCommMessage(message: DIDCommMessage): Promise<void> {
    // Forward the message using the routing service
    // This will be called by the MessageRoutingService
    console.log('Received DIDComm message:', message);
  }

  private async handleNotification(notification: any): Promise<void> {
    console.log('Received notification:', notification);
    // Process notification - this could trigger message routing
  }

  private async handleMessageProcessed(messageId: string): Promise<void> {
    console.log('Message processed:', messageId);
    // Mark message as processed in the queue
  }

  private async handleDisconnection(did: string): Promise<void> {
    try {
      // Update connection status in database
      await EdgeConnectionModel.findOneAndUpdate(
        { did },
        {
          lastSeen: new Date(),
          status: 'offline'
        }
      );
      console.log(`DID disconnected: ${did}`);
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  private async deliverPendingMessages(did: string): Promise<void> {
    // This will be implemented by the MessageRoutingService
    console.log(`Delivering pending messages for: ${did}`);
  }

  // Public methods for the MessageRoutingService
  public isConnectionActive(did: string): boolean {
    const ws = this.connections.get(did);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  public async sendToConnection(did: string, message: any): Promise<void> {
    const ws = this.connections.get(did);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      throw new Error(`Connection not available for DID: ${did}`);
    }
  }

  public getConnectedDIDs(): string[] {
    return Array.from(this.connections.keys());
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  // Broadcast message to all connected clients
  public broadcast(message: any): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Send message to specific DIDs
  public async sendToMultiple(dids: string[], message: any): Promise<void> {
    for (const did of dids) {
      try {
        await this.sendToConnection(did, message);
      } catch (error) {
        console.error(`Failed to send message to ${did}:`, error);
      }
    }
  }

  // Close connection for a specific DID
  public closeConnection(did: string): void {
    const ws = this.connections.get(did);
    if (ws) {
      ws.close();
    }
  }

  // Get connection status
  public getConnectionStatus(did: string): 'online' | 'offline' {
    return this.isConnectionActive(did) ? 'online' : 'offline';
  }
}