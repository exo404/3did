import axios, { AxiosInstance } from 'axios';
import { DIDIdentity, VerifiableCredential, NotificationItem, CredentialRequest, EdgeAgentResponse } from '../types';

class EdgeAgentService {
  private api: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // DID Management
  async createDID(): Promise<EdgeAgentResponse<{ did: string }>> {
    try {
      const response = await this.api.post('/api/did/create');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async getDIDs(): Promise<EdgeAgentResponse<{ dids: string[] }>> {
    try {
      const response = await this.api.get('/api/did/list');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async resolveDID(did: string): Promise<EdgeAgentResponse<{ document: any }>> {
    try {
      const response = await this.api.get(`/api/did/resolve/${encodeURIComponent(did)}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // Credential Management
  async issueCredential(request: CredentialRequest): Promise<EdgeAgentResponse<{ credential: VerifiableCredential }>> {
    try {
      const response = await this.api.post('/api/credentials/issue', request);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async verifyCredential(credential: VerifiableCredential): Promise<EdgeAgentResponse<{ valid: boolean }>> {
    try {
      const response = await this.api.post('/api/credentials/verify', { credential });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async revokeCredential(credentialId: string): Promise<EdgeAgentResponse<{ message: string }>> {
    try {
      const response = await this.api.post(`/api/credentials/revoke/${credentialId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async getCredentials(holderDid: string): Promise<EdgeAgentResponse<{ credentials: VerifiableCredential[] }>> {
    try {
      const response = await this.api.get(`/api/credentials/holder/${encodeURIComponent(holderDid)}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // Presentation Management
  async createPresentation(holderDid: string, credentials: VerifiableCredential[], challenge?: string): Promise<EdgeAgentResponse<{ presentation: any }>> {
    try {
      const response = await this.api.post('/api/presentations/create', {
        holderDid,
        credentials,
        challenge,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async verifyPresentation(presentation: any, challenge?: string): Promise<EdgeAgentResponse<{ status: string }>> {
    try {
      const response = await this.api.post('/api/presentations/verify', {
        presentation,
        challenge,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // QR Code Management
  async generateCredentialOfferQR(issuerDid: string, credentialType: string, callbackUrl: string): Promise<EdgeAgentResponse<{ qrCode: string }>> {
    try {
      const response = await this.api.post('/api/qr/credential-offer', {
        issuerDid,
        credentialType,
        callbackUrl,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async generatePresentationRequestQR(verifierDid: string, requiredCredentials: string[], callbackUrl: string, challenge?: string): Promise<EdgeAgentResponse<{ qrCode: string }>> {
    try {
      const response = await this.api.post('/api/qr/presentation-request', {
        verifierDid,
        requiredCredentials,
        callbackUrl,
        challenge,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async processQRCode(qrData: string, userDid: string): Promise<EdgeAgentResponse<{ message: string }>> {
    try {
      const response = await this.api.post('/api/qr/process', {
        qrData,
        userDid,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // Notification Management
  async getNotifications(did: string): Promise<EdgeAgentResponse<{ notifications: NotificationItem[] }>> {
    try {
      const response = await this.api.get(`/api/notifications/${encodeURIComponent(did)}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async processNotification(messageId: string, action: 'approve' | 'reject', data?: any): Promise<EdgeAgentResponse<{ message: string }>> {
    try {
      const response = await this.api.post('/api/notifications/process', {
        messageId,
        action,
        data,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // Health Check
  async healthCheck(): Promise<EdgeAgentResponse<{ status: string }>> {
    try {
      const response = await this.api.get('/health');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
}

export const edgeAgentService = new EdgeAgentService();
export default EdgeAgentService;