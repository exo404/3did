import {
  createAgent,
  ICredentialPlugin,
  IDataStore,
  IDIDManager,
  IKeyManager,
  IResolver,
  TAgent,
} from '@veramo/core';
import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDManager } from '@veramo/did-manager';
import { EthrDIDProvider } from '@veramo/did-provider-ethr';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { KeyManager } from '@veramo/key-manager';
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local';
import { Entities, KeyStore, DIDStore, PrivateKeyStore, migrations } from '@veramo/data-store';
import { DataSource } from 'typeorm';
import { getResolver as ethrDidResolver } from 'ethr-did-resolver';

const DATABASE_FILE = process.env.DATABASE_FILE || './database.sqlite';
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID || 'your-infura-project-id';
const KMS_SECRET_KEY = process.env.KMS_SECRET_KEY || '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c';

// Database connection
const dbConnection = new DataSource({
  type: 'sqlite',
  database: DATABASE_FILE,
  synchronize: false,
  migrations,
  migrationsRun: true,
  logging: ['error', 'info', 'warn'],
  entities: Entities,
});

// Agent configuration
export const agent: TAgent<IDIDManager & IKeyManager & IDataStore & IResolver & ICredentialPlugin> = createAgent<
  IDIDManager & IKeyManager & IDataStore & IResolver & ICredentialPlugin
>({
  plugins: [
    new KeyManager({
      store: new KeyStore(dbConnection),
      kms: {
        local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(KMS_SECRET_KEY))),
      },
    }),
    new DIDManager({
      store: new DIDStore(dbConnection),
      defaultProvider: 'did:ethr:sepolia',
      providers: {
        'did:ethr:sepolia': new EthrDIDProvider({
          defaultKms: 'local',
          network: 'sepolia',
          rpcUrl: `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
        }),
      },
    }),
    new DIDResolverPlugin({
      resolver: {
        ...ethrDidResolver({
          infuraProjectId: INFURA_PROJECT_ID,
        }),
      },
    }),
    new CredentialPlugin(),
  ],
});

export { dbConnection };