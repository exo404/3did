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

### Install sqlite:
```bash
yarn add sqlite3 typeorm reflect-metadata
```

### Create and save the secret key:
```bash
npx @veramo/cli config create-secret-key
```

### Start a service
```bash
node --loader ts-node/esm ./src/YOUR_TEST.ts
```

## Sequence Diagram for V1
<img width="682" height="1334" alt="image" src="https://github.com/user-attachments/assets/b5243968-277a-441d-82d4-3893fad85436" />
