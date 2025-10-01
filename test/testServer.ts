import {agent as agentClient1} from '../src/veramoAgentClient1.js' 
import {agent as agentClient2} from '../src/veramoAgentClient2.js' 
import {agentMediator } from '../src/veramoAgentMediator.js'
import { DIDCommMessageMediaType, Update, UpdateAction} from '@veramo/did-comm'
import { createV3DeliveryRequestMessage, createV3MediateRequestMessage, createV3RecipientUpdateMessage } from '@veramo/did-comm'
import { v4 as uuidv4 } from 'uuid'
//import {mediatorDID, holder1DID, holder2DID} from './testSetup.js'

const mediatorDID = 'did:ethr:sepolia:0x03dc145a72ae45a6658f786a133df86ea7ae77aeeaf38607e6b0fbfb3cc83d36f1'
const holder1DID = 'did:ethr:sepolia:0x03de483561f3a325411fda2a6c3d743cd0f225d9ee5a0027b8350ff978eb7b7479'
const holder2DID = 'did:ethr:sepolia:0x02d19e208dc0af0ff08b6658c67d6a9c53afdf6094ad58eddec528c0b2ce6684be'

// ------------------------------------------------------------------------------------------------------------
// --------------------------------------- HELPER FUNCTIONS -------------------------------------------------

async function sendMessage(senderDID: string, recipientDID: string, body: any, agent: any): Promise<any> {
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

async function receiveMessages (holderDID: string, agent: any) : Promise<any[]> {
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

async function addAllowedSender(recipientDID: string, agent: any): Promise<void> {
  try {
    const update: Update = { recipient_did: recipientDID, action: UpdateAction.ADD }
    const updateMessage = createV3RecipientUpdateMessage(recipientDID, mediatorDID, [update])
    const updateMessageContents = { packing: 'authcrypt', message: updateMessage } as const
    const packedUpdateMessage = await agent.packDIDCommMessage(updateMessageContents)
    await agent.sendDIDCommMessage({
      messageId: updateMessage.id,
      packedMessage: packedUpdateMessage,
      recipientDidUrl : mediatorDID,
    })
  } catch (err) {
    console.error('Errore aggiunta sender:', err)
  }
 }
async function registerWithMediator(agent : any, holderDID: string) {
    try{
        const mediateRequest = createV3MediateRequestMessage(holderDID, mediatorDID)

        const packedMessage = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message: mediateRequest,
        })

        const response = await agent.sendDIDCommMessage({
        messageId: mediateRequest.id,
        packedMessage,
        recipientDidUrl: mediatorDID,
        })
        console.log('Risposta mediatore:', response)
    } catch (err) {
        console.error('Errore connessione con il mediatore:', err)
    }
}

// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------- REGISTRATION -------------------------------------------------

await registerWithMediator(agentClient1, holder1DID)


