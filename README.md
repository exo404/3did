# 3did

## Project starting

### Init using yarn
```bash
mkdir 3did && cd 3did
yarn init -y
```

### Add config file package.json: 
```js
"type": "module"
```
### Install dev dependencies:
```bash
yarn add typescript ts-node --dev
```

### Install Veramo's core and plugins:
```bash
yarn add @veramo/core @veramo/data-store ethr-did-resolver @veramo/did-manager @veramo/did-provider-ethr @veramo/key-manager @veramo/kms-local @veramo/did-resolver @veramo/did-comm @veramo/did-jwt @veramo/message-handler @veramo/url-handler @veramo/selective-disclosure @veramo/credential-w3c @veramo/remote-server @veramo/remote-client

```

### Install sqlite and typeorm:
```bash
yarn add sqlite3 typeorm reflect-metadata
```

### Install express:
```bash
yarn add express
```

### Create and save the secret key:
```bash
npx @veramo/cli config create-secret-key
```

### Start a service
```bash
node --loader ts-node/esm ./src/YOUR_TEST.ts
```
## Local testnet deploy
### Install Anvil
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```
### Fork Sepolia
```bash
anvil \
  --fork-url https://sepolia.infura.io/v3/$INFURA_PROJECT_ID \
  --chain-id 11155111 \
  --port 8545 \
  --block-time 1
```

### Give 10ETH to a DID wallet
```bash
cast rpc anvil_setBalance 0xADDRESS 0x21E19E0C9BAB2400000
```

### RPC URL
Note that you'll use HTTP instead of HTTPS because Anvil doesn't use TLS
```bash
http://127.0.0.1:8545
```
## W3C VC implementation
### [Veramo docs](https://deepwiki.com/decentralized-identity/veramo/5.1-verifiable-credentials) 
<img width="682" height="751" alt="image" src="https://github.com/user-attachments/assets/c4f46482-9552-4cfe-b509-506aa74283aa" />

## Sequence Diagram for the Triangle of Trust flow
<img width="682" height="1334" alt="image" src="https://github.com/user-attachments/assets/b5243968-277a-441d-82d4-3893fad85436" />
