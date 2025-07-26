export interface DIDCommMessage {
  id: string;
  type: string;
  to: string;
  from: string;
  body: any;
  created_time: string;
  expires_time?: string;
  thread?: {
    thid?: string;
    pthid?: string;
  };
}

export interface EdgeConnection {
  did: string;
  endpoint: string;
  websocket?: any;
  lastSeen: Date;
  status: 'online' | 'offline';
}

export interface MessageQueue {
  id: string;
  recipientDid: string;
  message: DIDCommMessage;
  timestamp: Date;
  attempts: number;
  status: 'pending' | 'delivered' | 'failed';
}

export interface DIDRegistration {
  did: string;
  document: any;
  registeredAt: Date;
  lastUpdated: Date;
  status: 'active' | 'revoked';
}

export interface CloudAgentConfig {
  port: number;
  mongoUrl: string;
  redisUrl: string;
  ethereumRpcUrl: string;
  didRegistryContract: string;
}

export interface NotificationMessage {
  id: string;
  type: 'credential_request' | 'presentation_request' | 'verification_result';
  from: string;
  to: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'processed' | 'rejected';
}

export interface RoutingMessage {
  messageId: string;
  from: string;
  to: string;
  messageType: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
}