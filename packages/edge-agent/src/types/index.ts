import { VerifiableCredential, VerifiablePresentation } from '@veramo/core';

export interface DIDDocument {
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  service: ServiceEndpoint[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: object;
  publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface CredentialRequest {
  issuerDid: string;
  holderDid: string;
  credentialType: string;
  claims: Record<string, any>;
}

export interface CredentialResponse {
  credential: VerifiableCredential;
  status: 'issued' | 'pending' | 'rejected';
}

export interface PresentationRequest {
  verifierDid: string;
  holderDid: string;
  requiredCredentials: string[];
  challenge?: string;
}

export interface PresentationResponse {
  presentation: VerifiablePresentation;
  status: 'verified' | 'rejected';
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

export interface WalletCredential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, any>;
  proof: any;
  status: 'active' | 'revoked' | 'expired';
}

export interface QRCodeData {
  type: 'credential_offer' | 'presentation_request' | 'verification_request';
  data: any;
  callback_url: string;
}

export interface EdgeAgentConfig {
  port: number;
  cloudAgentUrl: string;
  didRegistryContract: string;
  ethereumRpcUrl: string;
  databasePath: string;
}