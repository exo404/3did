import {agent as agentHolder1} from '../src/veramoAgentHolder1.js' 
import {agent as agentHolder2} from '../src/veramoAgentHolder2.js'
import {agentMediator } from '../src/veramoAgentMediator.js'
import { listMessages, printDID } from './utils.js'
import '../src/actors/Recipient.js'
import { receiveDIDCommMessages, sendDIDCommMessage } from '../src/actors/Recipient.js'

const mediatorDID = 'did:ethr:sepolia:0x026a6196d546a2044a27425432b0e11578aa1ed7208177f59e87ed7ba0195eb088'
const holder1DID = 'did:ethr:sepolia:0x0260e9eaed455068c992f3602cfca1f5e5718f52f483155613ba5a745b41cb7075'
const holder2DID = 'did:ethr:sepolia:0x03b554e744ef20480dd7887a66cebe5d9ca38c7a7cdff873c6fe833d921a170cad'
const body = 'Hello from Holder1 to Holder2 via Mediator'

// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------- REGISTRATION ---------------------------------------------------

/*
await sendmediateRequestV3(agentHolder1, holder1DID)
await listMessages(agentHolder1)
await printDID('holder1', agentHolder1)
await sendmediateRequestV3(agentHolder2, holder2DID)
await listMessages(agentHolder2)
await printDID('holder2', agentHolder2)
*/

// ----------------------------------------------------------------------------------------------------------------
// ------------------------------------------- RECIPIENT UPDATE ---------------------------------------------------
/*
await sendRecipientUpdateV3(holder1DID, agentHolder1)
await listMessages(agentHolder1)
await sendRecipientUpdateV3(holder2DID, agentHolder2)
await listMessages(agentHolder2)
*/

// ----------------------------------------------------------------------------------------------------------------
// ------------------------------------------- RECIPIENT QUERY ---------------------------------------------------
/*
await sendRecipientQueryV3(holder1DID, agentHolder1)
await listMessages(agentHolder1)
await sendRecipientQueryV3(holder2DID, agentHolder2)
await listMessages(agentHolder2)
*/

// ----------------------------------------------------------------------------------------------------------------
// --------------------------------------- MESSAGE PICKUP V3 E ROUTING 2.0 ----------------------------------------
/*
await sendDIDCommMessage(holder1DID, holder2DID, body, agentHolder1)
const messages = await receiveDIDCommMessages(holder2DID, agentHolder2, mediatorDID)
let i = 0
for (const msg of messages) {
  console.log(`Messaggio ${i} ricevuto da Holder2 :`, msg)
  i++
}
*/