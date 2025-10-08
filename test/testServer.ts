import {agent as agentHolder1} from '../src/veramoAgentHolder1.js' 
import {agent as agentHolder2} from '../src/veramoAgentHolder2.js'
import {agentMediator } from '../src/veramoAgentMediator.js'
import { listMessages, printDID } from './utils.js'
import '../src/actors/Recipient.js'
import { sendMediateRequestV3, sendRecipientQueryV3, sendRecipientUpdateV3, receiveDIDCommMessages, sendDIDCommMessage } from '../src/actors/Recipient.js'

const mediatorDID = 'did:ethr:sepolia:0x029c8e232ebd379d72ad87adb2b9bb309cf88938888c473844feb252c446320a62'
const holder1DID = 'did:ethr:sepolia:0x03ae96ec1ab1fdf4fcfb55a3d42aea13a76092ca975c613951f1d75e016992c3f9'
const holder2DID = 'did:ethr:sepolia:0x03b161fa9bdfa30e2a7154e43b029808166706b40a972865ed82fce5d132710357'
const body = 'Hello from Holder1 to Holder2 via Mediator'

// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------- REGISTRATION ---------------------------------------------------


 await sendMediateRequestV3(agentHolder1, holder1DID, mediatorDID)
// await listMessages(agentHolder1)
// await printDID('holder1', agentHolder1)
 await sendMediateRequestV3(agentHolder2, holder2DID, mediatorDID)
// await listMessages(agentHolder2)
// await printDID('holder2', agentHolder2)


// ----------------------------------------------------------------------------------------------------------------
// ------------------------------------------- RECIPIENT UPDATE ---------------------------------------------------


await sendRecipientUpdateV3(holder1DID, agentHolder1, mediatorDID)
// await listMessages(agentHolder1)
await sendRecipientUpdateV3(holder2DID, agentHolder2, mediatorDID)
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

await sendDIDCommMessage(holder1DID, holder2DID, body, agentHolder1)

const messages = await receiveDIDCommMessages(holder2DID, agentHolder2, mediatorDID)
let i = 0
for (const msg of messages) {
  console.log(`Messaggio ${i} ricevuto da Holder2 :`, msg)
  i++
}
