# 3did

## Inizializzazione del progetto

### Inizializzazione con yarn
```bash
mkdir 3did && cd veramo-agent
yarn init -y
```

### Aggiungere al file di configurazione package.json: 
```js
"type": "module"
```
### Installare le dipendenze di sviluppo:
```bash
yarn add typescript ts-node --dev
```

### Installare Veramo con i plugin:
```bash
yarn add @veramo/core @veramo/data-store ethr-did-resolver @veramo/did-manager @veramo/did-provider-ethr @veramo/key-manager @veramo/kms-local @veramo/did-resolver @veramo/did-comm @veramo/did-jwt @veramo/message-handler @veramo/url-handler @veramo/selective-disclosure @veramo/credential-w3c @veramo/remote-server @veramo/remote-client

```

### Installare sqlite:
```bash
yarn add sqlite3 typeorm
```

### Generare e salvare la chiave segreta:
```bash
npx @veramo/cli config create-secret-key
```

### Avvio servizi
```bash
node --loader ts-node/esm ./src/YOUR_TEST.ts
```

## Diagrammi di sequenza
<img width="682" height="1334" alt="image" src="https://github.com/user-attachments/assets/b5243968-277a-441d-82d4-3893fad85436" />
