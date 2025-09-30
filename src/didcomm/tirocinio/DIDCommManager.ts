import { agent, DIDCommV2MessageType, MessagePickup, DIDCommV2MediatorMessageType} from './veramoAgentClient.js' 
import { DIDCommMessageMediaType, Update, UpdateAction} from '@veramo/did-comm'
import { CoordinateMediation, createV3DeliveryRequestMessage, createV3MediateRequestMessage, createV3RecipientUpdateMessage } from '@veramo/did-comm'
import { v4 as uuidv4 } from 'uuid'
import { createDID } from '../../triangle/holderService.js'
import { send } from 'process'


export class DIDCommManager {
  private myDID: string = ''
  private mediatorDID: string = ''
  async initialize(alias: string = 'default', mediatorDID: string = ''): Promise<void> {
    try {
      // Verifico se esiste già un DID con questo alias
      const identifiers = await agent.didManagerFind({ alias })
      
      if (identifiers.length > 0) {
        this.myDID = identifiers[0].did
        console.log(`DID esistente recuperato`)
      } 
      else{
        console.log(`DID non trovato, creazione in corso...`)
        this.myDID = (await createDID(alias)).did
        console.log(`DID creato: ${this.myDID}`)
      }
      if (mediatorDID !== '') {
        this.mediatorDID = mediatorDID
      }
      
    } catch (error) {
      console.error('Errore durante l\'inizializzazione:', error)
      throw error
    }
  }

  //Configuro il service endpoint per DIDComm
  public async setupDIDCommMediator(endpoint : string, routingKeys: string[]): Promise<void> {
    try {
      // Aggiungo il service endpoint per ricevere messaggi DIDComm
      await agent.didManagerAddService({
        did: this.myDID,
        service: {
          id: `${this.myDID}#didcomm-mediator`,
          type: "DIDCommMessaging",
          serviceEndpoint: [{uri: endpoint, routingKeys: routingKeys}],
        }
      })
      console.log('DIDComm Mediator configurato')
    } catch (error) {
      console.log('Errore:', error)
    }
  }

    //Configuro il service endpoint per DIDComm
  public async setupDIDComm(endpoint): Promise<void> {
    try {
      // Aggiungo il service endpoint per ricevere messaggi DIDComm
      await agent.didManagerAddService({
        did: this.myDID,
        service: {
          id: `${this.myDID}#didcomm`,
          type: "DIDCommMessaging",
          serviceEndpoint: endpoint,
        }
      })
      console.log('Service endpoint DIDComm configurato')
    } catch (error) {
      console.log('Errore:', error)
    }
  }

  //Invia un messaggio DIDComm a un altro agente
  async sendMessage(senderDID: string, recipientDID: string, body: any): Promise<any> {
    try {
      
      // Creo e impacchetto il messaggio
      const message = {
        type: DIDCommV2MessageType,
        from: senderDID,
        to: [recipientDID],
        id: uuidv4(),
        body: body,
      }

      const packedMessage = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message,
      })
      
      if (packedMessage) {
        const response = await agent.sendDIDCommMessage({
          messageId: uuidv4(),
          packedMessage,
          recipientDidUrl: recipientDID,
        })
      }
    }
    catch (error) {
      console.error('Errore nell\'invio del messaggio:', error)
      throw error
    }
  }

    //Invia un messaggio DIDComm a un altro agente tramite mediatore
  async sendMessageMediator(senderDID: string, recipientDID: string, body: any): Promise<any> {
    await this.registerWithMediator()
    await new Promise(resolve => setTimeout(resolve, 10000)); //Attendo 10 secondi per la registrazione
    await this.addAllowedSender(recipientDID)
    await new Promise(resolve => setTimeout(resolve, 10000)); //Attendo 10 secondi per l'aggiornamento della recipient list
    try {
          const innerMessage = await agent.packDIDCommMessage({
          packing: 'authcrypt',
          message: {
            type: DIDCommV2MessageType,
            to: [recipientDID],
            from: senderDID,
            id: uuidv4(),
            body: body,
            },
          })
          const msgID = uuidv4()
          const packedForwardMessage = await agent.packDIDCommMessage({
            packing: 'authcrypt',
            message: {
              type: DIDCommV2MediatorMessageType,
              to: [this.mediatorDID],
              from: senderDID,
              id: msgID,
              body: {
                next: recipientDID,
              },
              attachments: [
                {id: uuidv4(), media_type: DIDCommMessageMediaType.ENCRYPTED, data: { json: JSON.parse(innerMessage.message) } },
              ],
            },
          })
          const result = await agent.sendDIDCommMessage({
            messageId: msgID,
            packedMessage: packedForwardMessage,
            recipientDidUrl: this.mediatorDID,
        })
        return result
    } catch (error) {
      console.error('Errore nell\'invio del messaggio:', error)
      throw error
    }
  }

  async receiveMessages (did: string) : Promise<any[]> {
    const deliveryRequest = createV3DeliveryRequestMessage(did, this.mediatorDID)
    deliveryRequest.body = { limit: 100 } // Configurabile

    const packedRequest = await agent.packDIDCommMessage({
      packing: 'authcrypt',
      message: deliveryRequest,
    })

    const deliveryResponse = await agent.sendDIDCommMessage({
      packedMessage: packedRequest,
      recipientDidUrl: this.mediatorDID,
      messageId: deliveryRequest.id,
    })

    const messages = []
    for (const attachment of deliveryResponse?.returnMessage?.attachments ?? []) {
      const msg = await agent.handleMessage({
        raw: JSON.stringify(attachment.data.json),
      })
      messages.push({ message_id: attachment.id, ...msg.data })
    }
  return messages
}

async markMessageAsRead (messageIdList: string[]): Promise<void> {

  const messagesRequestMessage = {
    id: uuidv4(),
    type: MessagePickup.MESSAGES_RECEIVED,
    to: [this.mediatorDID],
    from: this.myDID,
    return_route: 'all',
    body: {
      message_id_list: messageIdList,
    },
  }

  const packedMessage = await agent.packDIDCommMessage({
    packing: 'authcrypt',
    message: messagesRequestMessage,
  })

  await agent.sendDIDCommMessage({
    messageId: messagesRequestMessage.id,
    packedMessage,
    recipientDidUrl: this.mediatorDID,
  })
}

// Registrazione del mediatore
async registerWithMediator(): Promise<void> {
  try {

    const mediateRequest = createV3MediateRequestMessage(this.myDID, this.mediatorDID)
    
    const packedMessage = await agent.packDIDCommMessage({
      packing: 'authcrypt',
      message: mediateRequest,
    })

    const response = await agent.sendDIDCommMessage({
      messageId: mediateRequest.id,
      packedMessage,
      recipientDidUrl: this.mediatorDID,
    })
  } catch (err) {
    console.error('Errore connessione con il mediatore:', err)
  }
}

async addAllowedSender(recipientDID: string): Promise<void> {
  try {
    const update: Update = { recipient_did: recipientDID, action: UpdateAction.ADD }
    const updateMessage = createV3RecipientUpdateMessage(recipientDID, this.mediatorDID, [update])
    const updateMessageContents = { packing: 'authcrypt', message: updateMessage } as const
    const packedUpdateMessage = await agent.packDIDCommMessage(updateMessageContents)
    await agent.sendDIDCommMessage({
      messageId: updateMessage.id,
      packedMessage: packedUpdateMessage,
      recipientDidUrl : this.mediatorDID,
    })
  } catch (err) {
    console.error('Errore aggiunta sender:', err)
  }
 }

  //Recupera tutti i messaggi salvati
  async getStoredMessages(): Promise<any[]> {
    const messages = await agent.dataStoreORMGetMessages({})
    return messages
  }

  //Getter DID corrente dell'agente
  getDID(): string {
    return this.myDID
  }
}