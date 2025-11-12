import {agent as agentHolder1} from '../src/veramoAgentHolder1.js' 
import {agent as agentHolder2} from '../src/veramoAgentHolder2.js'
import {agentMediator } from '../src/veramoAgentMediator.js'
import { listMessages, printDID } from './utils.js'
import '../src/actors/recipient.js'
import { sendMediateRequestV3, sendRecipientQueryV3, sendRecipientUpdateV3, receiveDIDCommMessages, sendDIDCommMessage, DIDCommBodyTypes } from '../src/actors/recipient.js'

const holder1DID = 'did:ethr:sepolia:0x02ef3331beb1629cee28399e31d83b28f32217798afc8219ccf2033012adf1d22a';
const holder2DID = 'did:ethr:sepolia:0x03701e98d0f5d255ae2781023087ef09a00a2f0459f78d162db920f83b063fbe7e';
const mediatorDID = 'did:ethr:sepolia:0x034c4e4267b21021c7a8b8066091f1660f752af1e3c8398eda656c8ed4d0fdeeba';
const body = 'Hello from Holder1 to Holder2 via Mediator'



// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------- REGISTRATION ---------------------------------------------------


 await sendMediateRequestV3(agentHolder1, holder1DID, mediatorDID, 'sender-mediate-req')
// await listMessages(agentHolder1)
// await printDID('holder1', agentHolder1)
 await sendMediateRequestV3(agentHolder2, holder2DID, mediatorDID, 'recipient-mediate-req')
// await listMessages(agentHolder2)
// await printDID('holder2', agentHolder2)


// ----------------------------------------------------------------------------------------------------------------
// ------------------------------------------- RECIPIENT UPDATE ---------------------------------------------------


await sendRecipientUpdateV3(holder1DID, agentHolder1, mediatorDID, 'sender-recipient-update')
// await listMessages(agentHolder1)
await sendRecipientUpdateV3(holder2DID, agentHolder2, mediatorDID, 'recipient-recipient-update')
// await listMessages(agentHolder2)


// ----------------------------------------------------------------------------------------------------------------
// ------------------------------------------- RECIPIENT QUERY ---------------------------------------------------
/*
await sendRecipientQueryV3(holder1DID, agentHolder1, mediatorDID)
await listMessages(agentHolder1)
await sendRecipientQueryV3(holder2DID, agentHolder2, mediatorDID)
await listMessages(agentHolder2)
*/

// ----------------------------------------------------------------------------------------------------------------
// --------------------------------------- MESSAGE PICKUP V3 E ROUTING 2.0 ----------------------------------------

await sendDIDCommMessage(holder1DID, holder2DID, body, DIDCommBodyTypes.BASIC_MESSAGE, agentHolder1, 'sender-to-recipient-message')

const messages = await receiveDIDCommMessages(holder2DID, agentHolder2, mediatorDID, 'recipient-receive-message')
let i = 0
for (const msg of messages) {
  console.log(`Messaggio ${i} ricevuto da Holder2: `, msg)
  i++
}
