import { agent } from '../config/veramo';
import { DIDDocument } from '../types';

export class DIDService {
  // Create a new DID
  async createDID(): Promise<string> {
    try {
      const identifier = await agent.didManagerCreate({
        provider: 'did:ethr:sepolia',
        alias: `did-${Date.now()}`,
      });
      return identifier.did;
    } catch (error) {
      console.error('Error creating DID:', error);
      throw new Error('Failed to create DID');
    }
  }

  // Resolve a DID to get its document
  async resolveDID(did: string): Promise<DIDDocument | null> {
    try {
      const result = await agent.resolveDid({ didUrl: did });
      if (result.didDocument) {
        return result.didDocument as DIDDocument;
      }
      return null;
    } catch (error) {
      console.error('Error resolving DID:', error);
      return null;
    }
  }

  // Get all managed DIDs
  async getManagedDIDs(): Promise<string[]> {
    try {
      const identifiers = await agent.didManagerFind();
      return identifiers.map(id => id.did);
    } catch (error) {
      console.error('Error getting managed DIDs:', error);
      return [];
    }
  }

  // Update DID document (add service endpoints, etc.)
  async updateDIDDocument(did: string, updates: Partial<DIDDocument>): Promise<boolean> {
    try {
      // In a real implementation, this would update the DID document on the blockchain
      // For Ethereum DIDs, this involves calling smart contract methods
      console.log(`Updating DID document for ${did}:`, updates);
      return true;
    } catch (error) {
      console.error('Error updating DID document:', error);
      return false;
    }
  }

  // Add service endpoint to DID
  async addServiceEndpoint(did: string, serviceId: string, serviceType: string, endpoint: string): Promise<boolean> {
    try {
      // This would typically involve updating the DID document on the blockchain
      console.log(`Adding service endpoint to ${did}: ${serviceId} -> ${endpoint}`);
      return true;
    } catch (error) {
      console.error('Error adding service endpoint:', error);
      return false;
    }
  }

  // Validate DID format
  validateDID(did: string): boolean {
    const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
    return didRegex.test(did);
  }

  // Get DID from alias
  async getDIDByAlias(alias: string): Promise<string | null> {
    try {
      const identifiers = await agent.didManagerFind({ alias });
      return identifiers.length > 0 ? identifiers[0].did : null;
    } catch (error) {
      console.error('Error getting DID by alias:', error);
      return null;
    }
  }
}