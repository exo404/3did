// ----------------------------------------------------------------------------------------------------
// ------------------------------------------- IMPORT -------------------------------------------------

// ....-------------------------- VERAMO ------------------------------
import { createAgent} from "@veramo/core"
import { IDIDManager, IResolver} from "@veramo/core"
import { IDataStore, IDataStoreORM} from "@veramo/core"
import { IKeyManager, ICredentialPlugin} from "@veramo/core"
import {IMessageHandler} from "@veramo/core"
import { IDIDComm, DIDComm, DIDCommMessageHandler, DIDCommHttpTransport, RoutingMessageHandler, CoordinateMediationRecipientMessageHandler, PickupRecipientMessageHandler } from "@veramo/did-comm"
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
import { CredentialPlugin, W3cMessageHandler } from "@veramo/credential-w3c"
import { CredentialSDJwt } from '@eengineer1/veramo-credential-sd-jwt'


// ---------------------------- UTILS ---------------------------------
import dotenv from 'dotenv'

// -----------------------------------------------------------------------------------------------------
// ------------------------------------------- DB INIT -------------------------------------------------

dotenv.config()
const infuraProjectId = process.env.INFURA_PROJECT_ID  
const secretKey = process.env.API_SECRET_KEY
const dbConnection = await new DataSource({
    type: 'sqlite',
    database: 'holder2.sqlite',
    synchronize: false,
    migrations: migrations,
    migrationsRun: true,
    logging: false,
    entities: Entities,
  }).initialize()


// -----------------------------------------------------------------------------------------------------
// ------------------------------------------- AGENT ---------------------------------------------------

export const agent = createAgent<  IDIDManager & IKeyManager &IDataStore & IDataStoreORM & IResolver &IMessageHandler 
                            & IDIDComm & ICredentialPlugin & IDIDDiscovery>
({
    plugins: [
        new KeyManager({
            store: new KeyStore(dbConnection),
            kms: {
                local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(secretKey)))
            }
        }),
        new DIDManager({
            store: new DIDStore(dbConnection),
            defaultProvider: 'did:ethr:sepolia',
            providers: {
                'did:ethr:sepolia': new EthrDIDProvider({
                    defaultKms: 'local',
                    network: 'sepolia',
                    rpcUrl: 'http://127.0.0.1:8545',
                    registry: '0x03d5003bf0e79C5F5223588F347ebA39AfbC3818', 
                    ttl: 60 * 60 * 24 * 30 * 12 + 1,
                }),
                'did:ethr': new EthrDIDProvider({
                    defaultKms: 'local',
                    network: 'mainnet',
                    rpcUrl: 'https://mainnet.infura.io/v3/' + infuraProjectId,
                    registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b', 
                    ttl: 60 * 60 * 24 * 30 * 12 + 1,
                }),
            }
        }),
        new DIDResolverPlugin({
            resolver: new Resolver({
                ...ethrDidResolver({
                    infuraProjectId: infuraProjectId,
                    networks: [
                        { 
                            name: 'sepolia', 
                            chainId: 11155111, 
                            rpcUrl: 'http://127.0.0.1:8545',
                            registry: '0x03d5003bf0e79C5F5223588F347ebA39AfbC3818'
                        },                        
                        { 
                            name: 'mainnet', 
                            chainId: 1, 
                            rpcUrl: 'https://mainnet.infura.io/v3/' + infuraProjectId,
                            registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b'
                        },

                    ]
                })
            })
        }),
        new DataStore(dbConnection),
        new DataStoreORM(dbConnection),
        new MessageHandler({
            messageHandlers: [
            new DIDCommMessageHandler(),
            new CoordinateMediationRecipientMessageHandler(),
            new PickupRecipientMessageHandler(),
            new RoutingMessageHandler(),
            new W3cMessageHandler(),
        ],
        }),
        new DIDComm({ transports: [new DIDCommHttpTransport()] }),
        new CredentialPlugin(),
        new DIDDiscovery({
            providers: [
                new AliasDiscoveryProvider(),
                new DataStoreDiscoveryProvider(),
            ],
        }),
        new CredentialSDJwt()
    ]
})
  