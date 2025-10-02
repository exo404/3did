import {agent as agentClient1} from '../src/veramoAgentClient1.js' 
import {agent as agentClient2} from '../src/veramoAgentClient2.js' 
import {agentMediator } from '../src/veramoAgentMediator.js'
import { createV3RecipientQueryMessage, Update, UpdateAction} from '@veramo/did-comm'
import { createV3DeliveryRequestMessage, createV3MediateRequestMessage, createV3RecipientUpdateMessage } from '@veramo/did-comm'
import { v4 as uuidv4 } from 'uuid'
import { listMessages, printDID } from './utils.js'
import {asArray} from '@veramo/utils'

const mediatorDID = 'did:ethr:sepolia:0x026a6196d546a2044a27425432b0e11578aa1ed7208177f59e87ed7ba0195eb088'
const holder1DID = 'did:ethr:sepolia:0x0260e9eaed455068c992f3602cfca1f5e5718f52f483155613ba5a745b41cb7075'
const holder2DID = 'did:ethr:sepolia:0x03b554e744ef20480dd7887a66cebe5d9ca38c7a7cdff873c6fe833d921a170cad'

// ------------------------------------------------------------------------------------------------------------
// --------------------------------------- HELPER FUNCTIONS -------------------------------------------------
async function sendMediateRequestV3(agent : any, holderDID: string) {
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
        console.log(res)
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


async function sendRecipientUpdateV3(holderDID: string, agent: any): Promise<void> {
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
      console.log(res)
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

 async function sendRecipientQueryV3(holderDID: string, agent: any): Promise<void> {
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
      console.log(res)
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

async function sendDIDCommMessage(senderDID: string, recipientDID: string, body: any, agent: any): Promise<any> {
    try {
        const message = {
        type: 'application/didcomm-plain+json',
        from: senderDID,
        to: [recipientDID],
        id: uuidv4(),
        body: body,
        return_route: 'all',
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
    } catch (error) {
        console.error('Errore nell\'invio del messaggio:', error)
        throw error
    }
}

async function receiveDIDCommMessages (holderDID: string, agent: any) : Promise<any[]> {
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
      messages.push({ message_id: attachment.id, ...msg.data })
    }
  return messages
}

// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------- REGISTRATION ---------------------------------------------------

/*
await sendmediateRequestV3(agentClient1, holder1DID)
await listMessages(agentClient1)
await printDID('holder1', agentClient1)
await sendmediateRequestV3(agentClient2, holder2DID)
await listMessages(agentClient2)
await printDID('holder2', agentClient2)
*/

// ----------------------------------------------------------------------------------------------------------------
// ------------------------------------------- RECIPIENT UPDATE ---------------------------------------------------
/*
await sendRecipientUpdateV3(holder1DID, agentClient1)
await listMessages(agentClient1)
await sendRecipientUpdateV3(holder2DID, agentClient2)
await listMessages(agentClient2)
*/

// ----------------------------------------------------------------------------------------------------------------
// ------------------------------------------- RECIPIENT QUERY ---------------------------------------------------
/*
await sendRecipientQueryV3(holder1DID, agentClient1)
await listMessages(agentClient1)
await sendRecipientQueryV3(holder2DID, agentClient2)
await listMessages(agentClient2)
*/