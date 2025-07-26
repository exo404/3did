# Decentralized Identity (DID) System

This is a complete implementation of a Decentralized Identity system with three layers: Edge Layer, Cloud Layer, and DID Layer, built using Scaffold-ETH, React, Node.js + Veramo, and Ethereum smart contracts.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Identity Owners                          │
│                     (Mobile/Desktop)                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────────────────────────┐
│                      Edge Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Edge Agent  │  │ Edge Agent  │  │ Edge Agent  │             │
│  │Edge Wallet  │  │Edge Wallet  │  │Edge Wallet  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Encrypted P2P verifiable claims exchange
┌─────────────────────────────────────────────────────────────────┐
│                     Cloud Layer                                 │
│  ┌─────────────┐                          ┌─────────────┐       │
│  │Cloud Agent  │ ←──────────────────────→ │Cloud Agent  │       │
│  │Cloud Wallet │                          │Cloud Wallet │       │
│  └─────────────┘                          └─────────────┘       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────────────────────────┐
│                      DID Layer                                  │
│                    (Blockchain)                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Edge Layer Client (Frontend + Backend)

**Location**: `packages/nextjs/app/did-wallet/` and `packages/edge-agent/`

**Frontend Features**:
- 👤 **Holder Mode**: Manage and present credentials
- 🏛️ **Issuer Mode**: Issue verifiable credentials
- ✅ **Verifier Mode**: Verify credential presentations
- 📱 **QR Code Scanner**: Scan credential offers and verification requests
- 🔔 **Notifications**: Handle credential requests and verification requests
- 🆔 **DID Management**: Create and switch between multiple DIDs

**Backend Features**:
- **Veramo Integration**: W3C compliant DID and VC management
- **DIDComm Protocol**: Secure communication between agents
- **Credential Storage**: Local SQLite database for credentials
- **Cloud Communication**: WebSocket connection to cloud agents
- **QR Code Generation**: For credential offers and verification requests

**Key Files**:
- `packages/nextjs/app/did-wallet/components/WalletDashboard.tsx` - Main UI
- `packages/edge-agent/src/index.ts` - Edge Agent server
- `packages/edge-agent/src/services/CredentialService.ts` - Credential management
- `packages/edge-agent/src/services/DIDService.ts` - DID operations

### 2. Cloud Layer (Backend)

**Location**: `packages/cloud-agent/`

**Features**:
- **Message Routing**: Route DIDComm messages between edge agents
- **Offline Message Queue**: Store messages when recipients are offline
- **WebSocket Server**: Real-time communication with edge agents
- **DID Resolution**: Resolve DIDs from blockchain
- **MongoDB Storage**: Persistent message and connection storage

**Key Files**:
- `packages/cloud-agent/src/index.ts` - Cloud Agent server
- `packages/cloud-agent/src/services/MessageRoutingService.ts` - Message routing
- `packages/cloud-agent/src/services/WebSocketService.ts` - Real-time communication
- `packages/cloud-agent/src/services/DIDResolverService.ts` - Blockchain integration

### 3. DID Layer (Smart Contracts)

**Location**: `packages/did-contracts/`

**Features**:
- **DID Registry**: Register, update, and revoke DIDs
- **Document Storage**: Store DID document hashes on-chain
- **Delegate Management**: Manage authorized delegates for DIDs
- **Access Control**: Owner-based permissions

**Key Files**:
- `packages/did-contracts/contracts/DIDRegistry.sol` - Main DID registry contract

## Installation & Setup

### Prerequisites

- Node.js >= 20.18.3
- Yarn
- MongoDB (for cloud agent)
- Ethereum node or Infura account

### 1. Install Dependencies

```bash
yarn install
```

### 2. Set Up Environment Variables

**Edge Agent** (`.env` in `packages/edge-agent/`):
```env
PORT=3001
CLOUD_AGENT_URL=http://localhost:3002
DATABASE_FILE=./database.sqlite
INFURA_PROJECT_ID=your-infura-project-id
KMS_SECRET_KEY=29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-infura-project-id
```

**Cloud Agent** (`.env` in `packages/cloud-agent/`):
```env
PORT=3002
MONGO_URL=mongodb://localhost:27017/cloud-agent
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-infura-project-id
DID_REGISTRY_CONTRACT=0x...
```

### 3. Start Services

**Terminal 1 - Start local blockchain:**
```bash
yarn chain
```

**Terminal 2 - Start Cloud Agent:**
```bash
cd packages/cloud-agent
yarn dev
```

**Terminal 3 - Start Edge Agent:**
```bash
cd packages/edge-agent
yarn dev
```

**Terminal 4 - Start Frontend:**
```bash
yarn start
```

### 4. Deploy Smart Contracts

```bash
yarn deploy
```

## Usage Guide

### 1. Access the DID Wallet

Navigate to `http://localhost:3000/did-wallet`

### 2. Create Your First DID

1. Click on the DID dropdown in the header
2. Select "Create New DID"
3. Your DID will be created using Veramo and registered with the cloud agent

### 3. Holder Operations

**Switch to Holder mode** and:
- View your credentials in "My Credentials"
- Scan QR codes to receive new credentials
- Handle incoming notifications for credential requests

### 4. Issuer Operations

**Switch to Issuer mode** and:
- Issue credentials directly to holder DIDs
- Generate QR codes for credential offers
- Choose from predefined credential types (Education, Employment, Identity, etc.)

### 5. Verifier Operations

**Switch to Verifier mode** and:
- Verify credentials by pasting JSON
- Generate QR codes for presentation requests
- Request specific credential types from holders

## API Endpoints

### Edge Agent (Port 3001)

**DID Management:**
- `POST /api/did/create` - Create new DID
- `GET /api/did/list` - List managed DIDs
- `GET /api/did/resolve/:did` - Resolve DID document

**Credential Management:**
- `POST /api/credentials/issue` - Issue credential
- `POST /api/credentials/verify` - Verify credential
- `GET /api/credentials/holder/:did` - Get credentials for holder
- `POST /api/credentials/revoke/:id` - Revoke credential

**QR Code Operations:**
- `POST /api/qr/credential-offer` - Generate credential offer QR
- `POST /api/qr/presentation-request` - Generate presentation request QR
- `POST /api/qr/process` - Process scanned QR code

**Notifications:**
- `GET /api/notifications/:did` - Get notifications for DID
- `POST /api/notifications/process` - Process notification

### Cloud Agent (Port 3002)

**Connection Management:**
- `GET /api/connections` - List edge connections
- `GET /api/connections/:did/status` - Get connection status

**Message Routing:**
- `POST /api/messages/send` - Send DIDComm message
- `GET /api/messages/:did` - Get pending messages
- `POST /api/messages/broadcast` - Broadcast to multiple DIDs

**DID Operations:**
- `GET /api/did/resolve/:did` - Resolve DID from blockchain
- `POST /api/did/register` - Register DID on blockchain

## Standards Compliance

### W3C Standards
- **DID Core 1.0**: Decentralized Identifiers specification
- **VC Data Model 1.1**: Verifiable Credentials data model
- **DID Resolution**: DID resolution specification

### DIDComm Protocol
- **DIDComm Messaging**: Secure, private communication
- **Message Threading**: Conversation threading
- **Transport Agnostic**: Works over HTTP, WebSocket, etc.

## Security Features

### Cryptographic Security
- **Ed25519 Keys**: For DID key generation
- **JWT Proofs**: For credential and presentation proofs
- **Encrypted Communication**: All agent-to-agent communication

### Access Control
- **DID Ownership**: Only DID owners can issue credentials as that DID
- **Holder Consent**: Holders must approve credential sharing
- **Revocation**: Credentials can be revoked by issuers

### Privacy
- **Selective Disclosure**: Share only required credential attributes
- **Zero-Knowledge Proofs**: Prove claims without revealing data (future enhancement)
- **Off-Chain Storage**: Sensitive data stored off-chain

## Architecture Benefits

### Scalability
- **Edge Processing**: Reduces cloud load
- **Message Queuing**: Handles offline scenarios
- **Horizontal Scaling**: Multiple cloud agents possible

### Interoperability
- **Standard Compliance**: W3C DID/VC standards
- **DIDComm Protocol**: Industry standard messaging
- **Blockchain Agnostic**: Can work with different blockchains

### User Experience
- **Simple UI**: Easy-to-use wallet interface
- **QR Code Integration**: Mobile-friendly interactions
- **Real-time Updates**: WebSocket notifications

## Future Enhancements

### Technical
- [ ] Zero-Knowledge Proof integration
- [ ] Mobile app development
- [ ] Multi-chain support
- [ ] IPFS integration for large credentials
- [ ] Biometric authentication

### Features
- [ ] Credential schemas registry
- [ ] Trust frameworks
- [ ] Governance mechanisms
- [ ] Analytics dashboard
- [ ] Backup and recovery

## Testing

### Unit Tests
```bash
# Test Edge Agent
cd packages/edge-agent
yarn test

# Test Cloud Agent
cd packages/cloud-agent
yarn test
```

### Integration Tests
```bash
# Test smart contracts
cd packages/hardhat
yarn test
```

### Manual Testing Scenarios

1. **End-to-End Credential Issuance**:
   - Create issuer DID
   - Create holder DID
   - Issue credential from issuer to holder
   - Verify credential appears in holder's wallet

2. **QR Code Flow**:
   - Generate credential offer QR as issuer
   - Scan QR as holder
   - Complete credential issuance

3. **Verification Flow**:
   - Generate presentation request QR as verifier
   - Scan QR as holder
   - Share credentials with verifier

## Troubleshooting

### Common Issues

**Edge Agent Connection Failed**:
- Ensure Edge Agent is running on port 3001
- Check environment variables
- Verify database permissions

**Cloud Agent WebSocket Errors**:
- Ensure MongoDB is running
- Check port 3002 availability
- Verify WebSocket connection in browser dev tools

**DID Resolution Failed**:
- Check Ethereum RPC URL
- Verify smart contract deployment
- Ensure sufficient gas for transactions

### Debug Mode

Enable debug logging:
```bash
DEBUG=* yarn dev
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## License

MIT License - see LICENSE file for details.

---

This implementation demonstrates a complete, production-ready DID system that follows W3C standards and implements the DIDComm protocol for secure, private communication between decentralized identity agents.