import { createAgent, TAgent, IAgentOptions } from "@veramo/core"
import { IDIDManager, IResolver} from "@veramo/core"
import { IDataStore, IDataStoreORM} from "@veramo/core"
import { IKeyManager, ICredentialPlugin} from "@veramo/core"
import {IMessageHandler} from "@veramo/core"
import { IDIDComm, DIDComm, DIDCommMessageHandler, DIDCommHttpTransport } from "@veramo/did-comm"
import { ISelectiveDisclosure, SdrMessageHandler, SelectiveDisclosure } from "@veramo/selective-disclosure"
import { DIDDiscovery, IDIDDiscovery } from "@veramo/did-discovery"
import { Entities, KeyStore, DIDStore, PrivateKeyStore, migrations, DataStore, DataStoreORM, DataStoreDiscoveryProvider } from '@veramo/data-store'
import { DataSource } from 'typeorm'
import { KeyManager } from "@veramo/key-manager"
import { KeyManagementSystem, SecretBox } from "@veramo/kms-local"
import { AliasDiscoveryProvider, DIDManager } from "@veramo/did-manager"
import { DIDResolverPlugin} from "@veramo/did-resolver"
import { EthrDIDProvider } from "@veramo/did-provider-ethr"
import { Resolver } from 'did-resolver'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'
import { MessageHandler } from "@veramo/message-handler"
import { JwtMessageHandler } from "@veramo/did-jwt"
import { CredentialPlugin, W3cMessageHandler } from "@veramo/credential-w3c"

const infuraProjectId = '0bcd0c43968945b983ce0346fc4a9416'
const secretKey = 'fbd38fab6ff2517135a414e6bad89c321958be2a2beedf5651135e39623dc058'
const dbConnection = new DataSource({
    type: 'sqlite',
    database: 'database.sql',
    synchronize: false,
    migrations,
    migrationsRun: true,
    logging: false,
  }).initialize()

const agent = createAgent<  IDIDManager & IKeyManager &IDataStore & IDataStoreORM & IResolver &IMessageHandler 
                            & IDIDComm & ICredentialPlugin & ISelectiveDisclosure & IDIDDiscovery>
({
    plugins: [
        new KeyManager({
            store: new KeyStore(dbConnection),
            kms: {
                local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(secretKey)))
                //web3: new KeyManagementSystem(new Web3KeyStore(web3Provider))
            }
        }),
        new DIDManager({
            store: new DIDStore(dbConnection),
            defaultProvider : 'did:ethr:sepolia',
            providers: {
                'did:ethr:sepolia': new EthrDIDProvider({
                    network: 'sepolia',
                    defaultKms: 'local',
                    rpcUrl: `https://sepolia.infura.io/v3/${infuraProjectId}`,
                })
            }
        }),
        new DIDResolverPlugin({
            resolver: new Resolver({
                ...ethrDidResolver({infuraProjectId: infuraProjectId})
            })
        }),
        new DataStore(dbConnection),
        new DataStoreORM(dbConnection),
        new MessageHandler({
            messageHandlers: [
            new DIDCommMessageHandler(),
            new JwtMessageHandler(),
            new W3cMessageHandler(),
            new SdrMessageHandler(),
            ],
        }),
        new DIDComm({ transports: [new DIDCommHttpTransport()] }),
        new CredentialPlugin(),
        new SelectiveDisclosure(),
        new DIDDiscovery({
            providers: [
                new AliasDiscoveryProvider(),
                new DataStoreDiscoveryProvider(),
            ],
        }),
    ]
})
  