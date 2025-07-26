export interface DIDIdentity {
  did: string;
  alias?: string;
  createdAt: Date;
  status: 'active' | 'revoked';
}

export interface VerifiableCredential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, any>;
  proof: any;
  status: 'active' | 'revoked' | 'expired';
}

export interface NotificationItem {
  id: string;
  type: 'credential_request' | 'presentation_request' | 'verification_result';
  from: string;
  to: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'processed' | 'rejected';
  title: string;
  description: string;
}

export interface QRCodeData {
  type: 'credential_offer' | 'presentation_request' | 'verification_request';
  data: any;
  callback_url: string;
}

export interface CredentialRequest {
  issuerDid: string;
  holderDid: string;
  credentialType: string;
  claims: Record<string, any>;
}

export interface PresentationRequest {
  verifierDid: string;
  holderDid: string;
  requiredCredentials: string[];
  challenge?: string;
}

export interface EdgeAgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WalletState {
  currentDid: string | null;
  dids: DIDIdentity[];
  credentials: VerifiableCredential[];
  notifications: NotificationItem[];
  isConnected: boolean;
}

export type UserRole = 'holder' | 'issuer' | 'verifier';

export interface RoleAction {
  role: UserRole;
  label: string;
  description: string;
  icon: string;
  action: () => void;
}