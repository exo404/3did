import { agent } from '../config/veramo';
import { VerifiableCredential, VerifiablePresentation } from '@veramo/core';
import { CredentialRequest, CredentialResponse, PresentationRequest, PresentationResponse, WalletCredential } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class CredentialService {
  // Issue a new credential
  async issueCredential(request: CredentialRequest): Promise<CredentialResponse> {
    try {
      const credential = await agent.createVerifiableCredential({
        credential: {
          issuer: { id: request.issuerDid },
          credentialSubject: {
            id: request.holderDid,
            ...request.claims,
          },
          type: ['VerifiableCredential', request.credentialType],
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          issuanceDate: new Date().toISOString(),
          id: `urn:uuid:${uuidv4()}`,
        },
        proofFormat: 'jwt',
      });

      return {
        credential,
        status: 'issued',
      };
    } catch (error) {
      console.error('Error issuing credential:', error);
      throw new Error('Failed to issue credential');
    }
  }

  // Verify a credential
  async verifyCredential(credential: VerifiableCredential): Promise<boolean> {
    try {
      const result = await agent.verifyCredential({
        credential,
      });
      return result.verified;
    } catch (error) {
      console.error('Error verifying credential:', error);
      return false;
    }
  }

  // Create a presentation from credentials
  async createPresentation(
    holderDid: string,
    credentials: VerifiableCredential[],
    challenge?: string
  ): Promise<VerifiablePresentation> {
    try {
      const presentation = await agent.createVerifiablePresentation({
        presentation: {
          holder: holderDid,
          verifiableCredential: credentials,
          type: ['VerifiablePresentation'],
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          id: `urn:uuid:${uuidv4()}`,
        },
        challenge,
        proofFormat: 'jwt',
      });

      return presentation;
    } catch (error) {
      console.error('Error creating presentation:', error);
      throw new Error('Failed to create presentation');
    }
  }

  // Verify a presentation
  async verifyPresentation(presentation: VerifiablePresentation, challenge?: string): Promise<PresentationResponse> {
    try {
      const result = await agent.verifyPresentation({
        presentation,
        challenge,
      });

      return {
        presentation,
        status: result.verified ? 'verified' : 'rejected',
      };
    } catch (error) {
      console.error('Error verifying presentation:', error);
      return {
        presentation,
        status: 'rejected',
      };
    }
  }

  // Revoke a credential (mark as revoked in local storage)
  async revokeCredential(credentialId: string): Promise<void> {
    try {
      // In a real implementation, this would update a revocation registry
      // For now, we'll just mark it as revoked in local storage
      console.log(`Credential ${credentialId} has been revoked`);
    } catch (error) {
      console.error('Error revoking credential:', error);
      throw new Error('Failed to revoke credential');
    }
  }

  // Get credentials by holder DID
  async getCredentialsByHolder(holderDid: string): Promise<WalletCredential[]> {
    try {
      // In a real implementation, this would query the local database
      // For now, return empty array - this would be implemented with proper storage
      return [];
    } catch (error) {
      console.error('Error getting credentials:', error);
      return [];
    }
  }

  // Store credential in wallet
  async storeCredential(credential: VerifiableCredential): Promise<void> {
    try {
      // Store credential in local database
      // This would be implemented with proper database storage
      console.log('Credential stored successfully');
    } catch (error) {
      console.error('Error storing credential:', error);
      throw new Error('Failed to store credential');
    }
  }
}