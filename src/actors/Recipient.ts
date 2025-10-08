import { createV3RecipientQueryMessage, Update, UpdateAction} from '@veramo/did-comm'
import { createV3DeliveryRequestMessage, createV3MediateRequestMessage, createV3RecipientUpdateMessage } from '@veramo/did-comm'
import { v4 as uuidv4 } from 'uuid'
import {asArray} from '@veramo/utils'


// -----------------------------------------------------------------------------------------------------------------
// --------------------------------------- COORDINATE MEDIATION V3 -------------------------------------------------
export async function sendMediateRequestV3(agent : any, holderDID: string, mediatorDID: string): Promise<void> {
    try{
        const mediateRequest = createV3MediateRequestMessage(holderDID, mediatorDID)
        const packedMessage = await agent.packDIDCommMessage({
          packing: 'authcrypt',
          message: mediateRequest,
        })

        const res = await agent.sendDIDCommMessage({
          messageId: mediateRequest.id,
          packedMessage,
          recipientDidUrl: mediatorDID,
        })
        if (res?.returnMessage) {
          await agent.dataStoreSaveMessage({
            message: {
              type: mediateRequest.type,
              from: mediateRequest.from,
              to: asArray(mediateRequest.to)[0],
              id: mediateRequest.id,
              data: mediateRequest.body,
              createdAt: mediateRequest.created_time
            },
          })
          const handled = await agent.handleMessage({
            raw: typeof res.returnMessage === 'string' ? res.returnMessage.raw : JSON.stringify(res.returnMessage.raw),
            save: true,
          })
          const prevRequestMsg = await agent.dataStoreGetMessage({ id: res.returnMessage.threadId })
          if (prevRequestMsg.from === res.returnMessage.to && prevRequestMsg.to === res.returnMessage.from) {
            console.log('Aggiornamento endpoint', holderDID)
            const service = {
              id: 'didcomm-mediator',
              type: 'DIDCommMessaging',
              serviceEndpoint: [
                {
                  uri: res.returnMessage.data.routing_did[0],
                },
              ],
            }
            await agent.didManagerAddService({
              did: holderDID,
              service: service,
            })  
          }     
        }
 
    } catch (err) {
        console.error('Errore nella registrazione:', err)
    }
}


export async function sendRecipientUpdateV3(holderDID: string, agent: any, mediatorDID: string): Promise<void> {
  try {
      const update : Update = { 
        recipient_did: holderDID, 
        action: UpdateAction.ADD 
      }
      const recipientUpdate = createV3RecipientUpdateMessage(holderDID, mediatorDID, [update])

      const packedMessage = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message: recipientUpdate,
      })

      const res = await agent.sendDIDCommMessage({
        messageId: recipientUpdate.id,
        packedMessage,
        recipientDidUrl: mediatorDID,
      })
      if (res?.returnMessage) {
        await agent.dataStoreSaveMessage({
          message: {
            type: recipientUpdate.type,
            from: recipientUpdate.from,
            to: asArray(recipientUpdate.to)[0],
            id: recipientUpdate.id,
            data: recipientUpdate.body,
            createdAt: recipientUpdate.created_time
          },
        })
        const handled = await agent.handleMessage({
          raw: typeof res.returnMessage === 'string' ? res.returnMessage.raw : JSON.stringify(res.returnMessage.raw),
          save: true,
        })
      }
  } catch (err) {
    console.error('Errore aggiunta sender:', err)
  }
 }

 export async function sendRecipientQueryV3(holderDID: string, agent: any, mediatorDID: string): Promise<void> {
  try {
      const recipientQuery = createV3RecipientQueryMessage(holderDID, mediatorDID)

      const packedMessage = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message: recipientQuery,
      })

      const res = await agent.sendDIDCommMessage({
        messageId: recipientQuery.id,
        packedMessage,
        recipientDidUrl: mediatorDID,
      })
      if (res?.returnMessage) {
        await agent.dataStoreSaveMessage({
          message: {
            type: recipientQuery.type,
            from: recipientQuery.from,
            to: asArray(recipientQuery.to)[0],
            id: recipientQuery.id,
            data: recipientQuery.body,
            createdAt: recipientQuery.created_time
          },
        })
        const handled = await agent.handleMessage({
          raw: typeof res.returnMessage === 'string' ? res.returnMessage.raw : JSON.stringify(res.returnMessage.raw),
          save: true,
        })
      }
  } catch (err) {
    console.error('Errore aggiunta sender:', err)
  }
 }
// --------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------- MESSAGE PICKUP V3 E ROUTING 2.0 --------------------------------------------------------
export async function sendDIDCommMessage(senderDID: string, recipientDID: string, body: any, agent: any): Promise<void> {
    try {
        const msg = {
            type: 'https://didcomm.org/basicmessage/2.0/message',
            from: senderDID,
            to: [recipientDID],
            id: uuidv4(),
            body: body
        }

        const packedMsg = await agent.packDIDCommMessage({
            packing: 'anoncrypt',
            message: msg,
        })
        if (packedMsg) {
        const response = await agent.sendDIDCommMessage({
            messageId: msg.id,
            packedMessage: packedMsg,
            recipientDidUrl: recipientDID,
        })
    }
    } catch (error) {
        console.error('Errore nell\'invio del messaggio:', error)
        throw error
    }
}

export async function receiveDIDCommMessages (holderDID: string, agent: any, mediatorDID: string) : Promise<any[]> {
    const deliveryRequest = createV3DeliveryRequestMessage(holderDID, mediatorDID)

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
      messages.push(msg.data)
    }
    return messages
}
