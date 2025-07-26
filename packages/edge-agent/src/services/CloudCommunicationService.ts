import { NotificationMessage } from '../types';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class CloudCommunicationService {
  private cloudAgentUrl: string;
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(cloudAgentUrl: string) {
    this.cloudAgentUrl = cloudAgentUrl;
    this.connect();
  }

  // Connect to cloud agent via WebSocket
  private connect(): void {
    try {
      this.ws = new WebSocket(this.cloudAgentUrl.replace('http', 'ws') + '/ws');

      this.ws.on('open', () => {
        console.log('Connected to cloud agent');
        this.reconnectAttempts = 0;
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleIncomingMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Disconnected from cloud agent');
        this.reconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('Error connecting to cloud agent:', error);
      this.reconnect();
    }
  }

  // Reconnect to cloud agent
  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), 5000 * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Handle incoming messages from cloud agent
  private handleIncomingMessage(message: any): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.log('Received unhandled message:', message);
    }
  }

  // Register message handler
  onMessage(messageType: string, handler: (message: any) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  // Send message to cloud agent
  async sendMessage(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      try {
        this.ws.send(JSON.stringify(message));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Send DIDComm message
  async sendDIDCommMessage(to: string, from: string, type: string, body: any): Promise<void> {
    const message = {
      id: uuidv4(),
      type,
      to,
      from,
      body,
      created_time: new Date().toISOString(),
    };

    await this.sendMessage({
      type: 'didcomm_message',
      message,
    });
  }

  // Send notification to cloud agent for delivery
  async sendNotification(notification: NotificationMessage): Promise<void> {
    await this.sendMessage({
      type: 'notification',
      notification,
    });
  }

  // Request credential from issuer via cloud agent
  async requestCredential(issuerDid: string, holderDid: string, credentialType: string, claims: any): Promise<void> {
    await this.sendDIDCommMessage(
      issuerDid,
      holderDid,
      'https://didcomm.org/issue-credential/2.0/request-credential',
      {
        credentialType,
        claims,
      }
    );
  }

  // Send presentation to verifier via cloud agent
  async sendPresentation(verifierDid: string, holderDid: string, presentation: any): Promise<void> {
    await this.sendDIDCommMessage(
      verifierDid,
      holderDid,
      'https://didcomm.org/present-proof/2.0/presentation',
      {
        presentation,
      }
    );
  }

  // Register DID with cloud agent
  async registerDID(did: string): Promise<void> {
    await this.sendMessage({
      type: 'register_did',
      did,
    });
  }

  // Get pending messages for a DID
  async getPendingMessages(did: string): Promise<NotificationMessage[]> {
    try {
      const response = await fetch(`${this.cloudAgentUrl}/api/messages/${did}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return [];
    }
  }

  // Mark message as processed
  async markMessageProcessed(messageId: string): Promise<void> {
    await this.sendMessage({
      type: 'message_processed',
      messageId,
    });
  }

  // Disconnect from cloud agent
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}