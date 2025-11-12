// ----------------------------------------------------------------------------------------------------
// ------------------------------------------- IMPORT -------------------------------------------------
import { 
  MediationManagerPlugin, 
  MediationResponse, 
  PreMediationRequestPolicy, 
  RequesterDid
} from '@veramo/mediation-manager'

import {
  KeyValueStore,
  KeyValueTypeORMStoreAdapter,
  Entities as KVStoreEntities,
  kvStoreMigrations,
} from '@veramo/kv-store'

import {DataSource } from 'typeorm'

import {
  DataStore,
  DataStoreORM,
  DIDStore,
  Entities, 
  KeyStore, 
  migrations,
  PrivateKeyStore
} from '@veramo/data-store'

// Handler Veramo per il protocollo Coordinate Mediation v3 
import {
  CoordinateMediationV3MediatorMessageHandler,
  DIDComm,
  DIDCommHttpTransport,
  DIDCommMessageHandler,
  IDIDComm,
  PickupMediatorMessageHandler,
  RoutingMessageHandler,
} from '@veramo/did-comm'

import { KeyManager } from '@veramo/key-manager'
import { DIDManager } from '@veramo/did-manager'
import { EthrDIDProvider } from '@veramo/did-provider-ethr'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { Resolver } from 'did-resolver'
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'
import { 
  createAgent, 
  ICredentialPlugin, 
  IDataStore, 
  IDataStoreORM, 
  IDIDManager, 
  IKeyManager, 
  IMessageHandler, 
  IResolver 
} from '@veramo/core'
import { MessageHandler } from '@veramo/message-handler'
import { CredentialPlugin } from '@veramo/credential-w3c'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'

import dotenv from 'dotenv'

// -----------------------------------------------------------------------------------------------------
// ------------------------------------------- DB INIT -------------------------------------------------

dotenv.config()
const infuraProjectId = process.env.INFURA_PROJECT_ID  
const secretKey = process.env.MEDIATOR_SECRET_KEY
const anvilRpcUrl = process.env.ANVIL_RPC_URL ?? 'http://127.0.0.1:8545'
const dbConnection = new DataSource({
  name: 'mediator',
  type: 'sqlite',
  database: './mediator.sqlite',
  synchronize: false,
  migrations: [...migrations ,...kvStoreMigrations],
  migrationsRun: true,
  logging: false,
  entities: [...Entities ,...KVStoreEntities],
}).initialize()


// --------------------------------------------------------------------------------------------------------------
// ------------------------------------------- COORDINATE MEDIATION V3 ------------------------------------------
  const policyStore = new KeyValueStore<PreMediationRequestPolicy>({
    namespace: 'mediation_policy',
    store: new KeyValueTypeORMStoreAdapter({ dbConnection, namespace: 'mediation_policy' }),
  })

  const mediationStore = new KeyValueStore<MediationResponse>({
    namespace: 'mediation_response',
    store: new KeyValueTypeORMStoreAdapter({ dbConnection, namespace: 'mediation_response' }),
  })

  const recipientDidStore = new KeyValueStore<RequesterDid>({
    namespace: 'recipient_did',
    store: new KeyValueTypeORMStoreAdapter({ dbConnection, namespace: 'recipient_did' }),
  })

const isDefaultMediateGrantAll = true;

const mediationManager = new MediationManagerPlugin(
  isDefaultMediateGrantAll,
  policyStore,
  mediationStore,
  recipientDidStore
)

// ---------------------------------------------------------------------------------------------------------------
// -------------------------------------------------  AGENT ------------------------------------------------------

export const agentMediator = createAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & IMessageHandler & IDIDComm & ICredentialPlugin>
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
                      rpcUrl: anvilRpcUrl + infuraProjectId,
                      registry: '0x03d5003bf0e79C5F5223588F347ebA39AfbC3818', 
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
                              rpcUrl: anvilRpcUrl + infuraProjectId,
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
                  new PickupMediatorMessageHandler(),
                  new RoutingMessageHandler(),
              ],
          }),
          new DIDComm({ transports: [new DIDCommHttpTransport()] }),
          new CredentialPlugin(),
          mediationManager,
      ]
  })


