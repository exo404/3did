import { Request, Response } from 'express';
import { CredentialService } from '../services/CredentialService';
import { DIDService } from '../services/DIDService';
import { CloudCommunicationService } from '../services/CloudCommunicationService';
import { QRCodeGenerator } from '../utils/QRCodeGenerator';
import { CredentialRequest, PresentationRequest, NotificationMessage } from '../types';

export class EdgeAgentController {
  private credentialService: CredentialService;
  private didService: DIDService;
  private cloudService: CloudCommunicationService;

  constructor(cloudAgentUrl: string) {
    this.credentialService = new CredentialService();
    this.didService = new DIDService();
    this.cloudService = new CloudCommunicationService(cloudAgentUrl);
  }

  // Create a new DID
  createDID = async (req: Request, res: Response): Promise<void> => {
    try {
      const did = await this.didService.createDID();
      await this.cloudService.registerDID(did);
      res.json({ did, message: 'DID created successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create DID' });
    }
  };

  // Get all managed DIDs
  getDIDs = async (req: Request, res: Response): Promise<void> => {
    try {
      const dids = await this.didService.getManagedDIDs();
      res.json({ dids });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get DIDs' });
    }
  };

  // Resolve a DID
  resolveDID = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did } = req.params;
      const document = await this.didService.resolveDID(did);
      if (document) {
        res.json({ document });
      } else {
        res.status(404).json({ error: 'DID not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve DID' });
    }
  };

  // Issue a credential
  issueCredential = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CredentialRequest = req.body;
      const response = await this.credentialService.issueCredential(request);
      
      // Send notification to holder via cloud agent
      const notification: NotificationMessage = {
        id: `cred-${Date.now()}`,
        type: 'credential_request',
        from: request.issuerDid,
        to: request.holderDid,
        data: response.credential,
        timestamp: new Date(),
        status: 'pending',
      };
      await this.cloudService.sendNotification(notification);

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to issue credential' });
    }
  };

  // Verify a credential
  verifyCredential = async (req: Request, res: Response): Promise<void> => {
    try {
      const { credential } = req.body;
      const isValid = await this.credentialService.verifyCredential(credential);
      res.json({ valid: isValid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify credential' });
    }
  };

  // Create a presentation
  createPresentation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { holderDid, credentials, challenge } = req.body;
      const presentation = await this.credentialService.createPresentation(holderDid, credentials, challenge);
      res.json({ presentation });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create presentation' });
    }
  };

  // Verify a presentation
  verifyPresentation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { presentation, challenge } = req.body;
      const response = await this.credentialService.verifyPresentation(presentation, challenge);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify presentation' });
    }
  };

  // Revoke a credential
  revokeCredential = async (req: Request, res: Response): Promise<void> => {
    try {
      const { credentialId } = req.params;
      await this.credentialService.revokeCredential(credentialId);
      res.json({ message: 'Credential revoked successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke credential' });
    }
  };

  // Get credentials for a holder
  getCredentials = async (req: Request, res: Response): Promise<void> => {
    try {
      const { holderDid } = req.params;
      const credentials = await this.credentialService.getCredentialsByHolder(holderDid);
      res.json({ credentials });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get credentials' });
    }
  };

  // Generate QR code for credential offer
  generateCredentialOfferQR = async (req: Request, res: Response): Promise<void> => {
    try {
      const { issuerDid, credentialType, callbackUrl } = req.body;
      const qrCode = await QRCodeGenerator.generateCredentialOfferQR(issuerDid, credentialType, callbackUrl);
      res.json({ qrCode });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  };

  // Generate QR code for presentation request
  generatePresentationRequestQR = async (req: Request, res: Response): Promise<void> => {
    try {
      const { verifierDid, requiredCredentials, callbackUrl, challenge } = req.body;
      const qrCode = await QRCodeGenerator.generatePresentationRequestQR(
        verifierDid,
        requiredCredentials,
        callbackUrl,
        challenge
      );
      res.json({ qrCode });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  };

  // Process QR code scan
  processQRCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { qrData, userDid } = req.body;
      const parsedData = QRCodeGenerator.parseQRCodeData(qrData);
      
      if (!parsedData) {
        res.status(400).json({ error: 'Invalid QR code data' });
        return;
      }

      switch (parsedData.type) {
        case 'credential_offer':
          // Handle credential offer
          await this.cloudService.requestCredential(
            parsedData.data.issuer,
            userDid,
            parsedData.data.credentialType,
            {}
          );
          res.json({ message: 'Credential request sent' });
          break;

        case 'presentation_request':
          // Handle presentation request
          const credentials = await this.credentialService.getCredentialsByHolder(userDid);
          const requiredCreds = credentials.filter(cred => 
            parsedData.data.requiredCredentials.includes(cred.type[1])
          );
          
          if (requiredCreds.length > 0) {
            const presentation = await this.credentialService.createPresentation(
              userDid,
              requiredCreds as any[],
              parsedData.data.challenge
            );
            await this.cloudService.sendPresentation(parsedData.data.verifier, userDid, presentation);
            res.json({ message: 'Presentation sent' });
          } else {
            res.status(400).json({ error: 'Required credentials not found' });
          }
          break;

        default:
          res.status(400).json({ error: 'Unknown QR code type' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to process QR code' });
    }
  };

  // Get notifications
  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { did } = req.params;
      const messages = await this.cloudService.getPendingMessages(did);
      res.json({ notifications: messages });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  };

  // Process notification response
  processNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { messageId, action, data } = req.body;
      
      // Mark message as processed
      await this.cloudService.markMessageProcessed(messageId);
      
      // Handle the action (approve/reject credential request, etc.)
      res.json({ message: 'Notification processed', action });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process notification' });
    }
  };
}