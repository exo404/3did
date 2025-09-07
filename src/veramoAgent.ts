import { createAgent, TAgent, IAgentOptions } from "@veramo/core"
import { IDIDManager, IResolver} from "@veramo/core"
import { IDataStore, IDataStoreORM} from "@veramo/core"
import { IKeyManager, ICredentialPlugin} from "@veramo/core"
import {IMessageHandler} from "@veramo/core"
import { IDIDComm, DIDComm, DIDCommMessageHandler, DIDCommHttpTransport, RoutingMessageHandler } from "@veramo/did-comm"
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
import { MessageHandler} from "@veramo/message-handler"
import { JwtMessageHandler } from "@veramo/did-jwt"
import { CredentialIssuer, CredentialPlugin, W3cMessageHandler } from "@veramo/credential-w3c"

import { IMediationManager, MediationManagerPlugin, PreMediationRequestPolicy, MediationResponse, RequesterDid } from '@veramo/mediation-manager'
import { KeyValueStore, KeyValueTypeORMStoreAdapter, Entities as KVStoreEntities, kvStoreMigrations} from '@veramo/kv-store'
import { CoordinateMediationV3MediatorMessageHandler, CoordinateMediationV3RecipientMessageHandler,  } from '@veramo/did-comm'

import dotenv from 'dotenv'
dotenv.config()

//// TIPI ENUM ////

// Tipo dei DIDCommV2
export const DIDCommV2MessageType = 'https://didcomm.org/basicmessage/2.0/message'
export const DIDCommV2MediatorMessageType = 'https://didcomm.org/routing/2.0/forward'

// Tipi per Coordinate Mediation v3
export enum CoordinateMediation {
  MEDIATE_REQUEST = 'https://didcomm.org/coordinate-mediation/3.0/mediate-request',
  MEDIATE_GRANT = 'https://didcomm.org/coordinate-mediation/3.0/mediate-grant',
  MEDIATE_DENY = 'https://didcomm.org/coordinate-mediation/3.0/mediate-deny',
  RECIPIENT_UPDATE = 'https://didcomm.org/coordinate-mediation/3.0/recipient-update',
  RECIPIENT_UPDATE_RESPONSE = 'https://didcomm.org/coordinate-mediation/3.0/recipient-update-response',
  RECIPIENT_QUERY = 'https://didcomm.org/coordinate-mediation/3.0/recipient-query',
  RECIPIENT_QUERY_RESPONSE = 'https://didcomm.org/coordinate-mediation/3.0/recipient-query-response'
}
// Tipi per Message Pickup v3
export enum MessagePickup {
  STATUS_REQUEST = 'https://didcomm.org/messagepickup/3.0/status-request',
  STATUS = 'https://didcomm.org/messagepickup/3.0/status',
  DELIVERY_REQUEST = 'https://didcomm.org/messagepickup/3.0/delivery-request',
  DELIVERY = 'https://didcomm.org/messagepickup/3.0/delivery',
  MESSAGES_RECEIVED = 'https://didcomm.org/messagepickup/3.0/messages-received',
  LIVE_DELIVERY_CHANGE = 'https://didcomm.org/messagepickup/3.0/live-delivery-change'
}



/// CONFIGURAZIONE AGENTE ///

const infuraProjectId = process.env.INFURA_PROJECT_ID  
const secretKey = process.env.API_SECRET_KEY
const dbConnection = await new DataSource({
    type: 'sqlite',
    database: 'database.sqlite',
    synchronize: false,
    migrations: [...migrations, ...kvStoreMigrations],
    migrationsRun: true,
    logging: false,
    entities: [...Entities, ...KVStoreEntities],
  }).initialize()

// Configuro gli store per la mediazione
const policyStore = new KeyValueStore<PreMediationRequestPolicy>({
    namespace: 'mediation_policy',
    store: new KeyValueTypeORMStoreAdapter({ 
    dbConnection: dbConnection, 
    namespace: 'mediation_policy',
    }),
})

const mediationStore = new KeyValueStore<MediationResponse>({
    namespace: 'mediation_response',
    store: new KeyValueTypeORMStoreAdapter({ 
    dbConnection: dbConnection, 
    namespace: 'mediation_response' 
    }),
})

const recipientDidStore = new KeyValueStore<RequesterDid>({
    namespace: 'recipient_did',
    store: new KeyValueTypeORMStoreAdapter({ 
    dbConnection: dbConnection, 
    namespace: 'recipient_did' 
    }),
})


export const agent = createAgent<  IDIDManager & IKeyManager &IDataStore & IDataStoreORM & IResolver &IMessageHandler 
                            & IDIDComm & ICredentialPlugin & ISelectiveDisclosure & IDIDDiscovery & IMediationManager>
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
            defaultProvider: 'did:ethr:sepolia',
            providers: {
                'did:ethr:sepolia': new EthrDIDProvider({
                    defaultKms: 'local',
                    network: 'sepolia',
                    rpcUrl: 'https://sepolia.infura.io/v3/' + infuraProjectId,
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
                            name: 'mainnet', 
                            chainId: 1, 
                            rpcUrl: 'https://mainnet.infura.io/v3/' + infuraProjectId,
                            registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b'
                        },
                        { 
                            name: 'sepolia', 
                            chainId: 11155111, 
                            rpcUrl: 'https://sepolia.infura.io/v3/' + infuraProjectId,
                            registry: '0x03d5003bf0e79C5F5223588F347ebA39AfbC3818'
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
            new CoordinateMediationV3MediatorMessageHandler(), 
            new RoutingMessageHandler(),
            //new MessagePickupV3MessageHandler(),
            new CoordinateMediationV3RecipientMessageHandler(),
        ],
        }),
        new DIDComm({ transports: [new DIDCommHttpTransport()] }),
        new CredentialPlugin(),
        new CredentialIssuer(),
        new SelectiveDisclosure(),
        new DIDDiscovery({
            providers: [
                new AliasDiscoveryProvider(),
                new DataStoreDiscoveryProvider(),
            ],
        }),
        new MediationManagerPlugin(
          true, // isMediateDefaultGrantAll
          policyStore,
          mediationStore,
          recipientDidStore
        )
    ]
})
  