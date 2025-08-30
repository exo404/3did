import { agent } from './veramoAgent.js' 
import { IDIDCommMessage, IPackedDIDCommMessage, DIDCommMessageMediaType, UpdateAction} from '@veramo/did-comm'
import {
  CoordinateMediation,
  createV3DeliveryRequestMessage,
  createV3MediateRequestMessage,
  createV3RecipientQueryMessage,
  createV3RecipientUpdateMessage,
} from '@veramo/did-comm'
import { v4 as uuidv4 } from 'uuid'
import { createDID } from './holderService.js'


export class DIDCommManager {
  private myDID: string = ''
  private mediatorDID: string = ''
  async initialize(alias: string = 'default', mediatorDID? : string): Promise<void> {
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
      if (mediatorDID) {
        this.mediatorDID = mediatorDID
        console.log(`Mediatore impostato: ${this.mediatorDID}`)
      } else {
        console.log('Nessun mediatore fornito, alcune funzionalità potrebbero non essere disponibili.')
      }
    } catch (error) {
      console.error('Errore durante l\'inizializzazione:', error)
      throw error
    }
  }

  //Configuro il service endpoint per DIDComm
  private async setupDIDCommService(endpoint : string, type : string, id : string, description : string): Promise<void> {
    try {
      // Aggiungo il service endpoint per ricevere messaggi DIDComm
      await agent.didManagerAddService({
        did: this.myDID,
        service: {
          id: `${this.myDID}{id}`,
          type: type,
          serviceEndpoint: endpoint, // endpoint configurato
          description: description,
        }
      })
      console.log('Service endpoint DIDComm configurato')
    } catch (error) {
      console.log('Service endpoint già esistente o errore:', error)
    }
  }

  //Invia un messaggio DIDComm a un altro agente
  async sendMessage(senderDID: string, recipientDID: string, body: any): Promise<any> {
    try {
      const messageType = 'https://didcomm.org/basicmessage/2.0/message'
      // Creo e impacchetto il messaggio
      const message = {
        type: 'https://didcomm.org/basicmessage/2.0/message',
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
        await agent.sendDIDCommMessage({
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

  async receiveMessages (did: string, mediatorDID: string) : Promise<any[]> {
    const deliveryRequest = createV3DeliveryRequestMessage(did, mediatorDID)
    deliveryRequest.body = { limit: 100 } // Configurabile

    const packedRequest = await agent.packDIDCommMessage({
      packing: 'authcrypt',
      message: deliveryRequest,
    })

    const deliveryResponse = await agent.sendDIDCommMessage({
      packedMessage: packedRequest,
      recipientDidUrl: mediatorDID,
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

async markMessageAsRead (did: any, mediatorDID : string, messageIdList: string[]): Promise<void> {
  const MESSAGES_RECEIVED_MESSAGE_TYPE = 'https://didcomm.org/messagepickup/3.0/messages-received'

  const messagesRequestMessage = {
    id: uuidv4(),
    type: MESSAGES_RECEIVED_MESSAGE_TYPE,
    to: [mediatorDID],
    from: did,
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
    recipientDidUrl: mediatorDID,
  })
}

  async createMediatorConnection (recipientDID: any) {
    try {
      // Crea richiesta di mediazione
      const mediateRequestMessage = createV3MediateRequestMessage(recipientDID, this.mediatorDID)

      const packedMessage = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message: mediateRequestMessage,
      })

      const sentMessage = await agent.sendDIDCommMessage({
        messageId: mediateRequestMessage.id,
        packedMessage,
        recipientDidUrl: this.mediatorDID,
      })

      // Aggiorna il destinatario con il mediatore
      const update = createV3RecipientUpdateMessage(recipientDID, this.mediatorDID, [
        {
          recipient_did: recipientDID,
          action: UpdateAction.ADD,
        },
      ])

      const packedUpdate = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message: update,
      })
      const updateResponse = await agent.sendDIDCommMessage({
        packedMessage: packedUpdate,
        recipientDidUrl: this.mediatorDID,
        messageId: update.id,
      })

      const query = createV3RecipientQueryMessage(recipientDID, this.mediatorDID)

      const packedQuery = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message: query,
      })
      const queryResponse = await agent.sendDIDCommMessage({
        packedMessage: packedQuery,
        recipientDidUrl: this.mediatorDID,
        messageId: query.id,
      })

      console.log('queryResponse', queryResponse)
    } catch (err) {
      console.log(err)
    }
  }
  async ensureMediationGranted (recipientDID: string) {
    const request = createV3MediateRequestMessage(recipientDID, this.mediatorDID)
    const packedRequest = await agent.packDIDCommMessage({
      packing: 'authcrypt',
      message: request,
    })
    const mediationResponse = await agent.sendDIDCommMessage({
      packedMessage: packedRequest,
      recipientDidUrl: this.mediatorDID,
      messageId: request.id,
    })

    if (mediationResponse.returnMessage?.type !== CoordinateMediation.MEDIATE_GRANT) {
      throw new Error('mediation not granted')
    }
    const update = createV3RecipientUpdateMessage(recipientDID, this.mediatorDID, [
      {
        recipient_did: recipientDID,
        action: UpdateAction.ADD,
      },
    ])
    const packedUpdate = await agent.packDIDCommMessage({
      packing: 'authcrypt',
      message: update,
    })
    const updateResponse = await agent.sendDIDCommMessage({
      packedMessage: packedUpdate,
      recipientDidUrl: this.mediatorDID,
      messageId: update.id,
    })

    if (
      updateResponse.returnMessage?.type !== CoordinateMediation.RECIPIENT_UPDATE_RESPONSE ||
      (updateResponse.returnMessage?.data && 
      'updates' in updateResponse.returnMessage.data &&
      Array.isArray(updateResponse.returnMessage.data.updates) &&
      updateResponse.returnMessage.data.updates[0]?.result !== 'success')
    )
    {
      throw new Error('mediation update failed')
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