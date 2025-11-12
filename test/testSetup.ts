import {agent as agentClient1} from '../src/veramoAgentHolder1.js'
import {agent as agentClient2} from '../src/veramoAgentHolder2.js'
import {agent as agentClient3} from '../src/veramoAgentHolder3.js'
import { addKeyToDID, createDID } from '../src/actors/holderService.js'
import { findDIDAddress } from './utils.js'
import dotenv from 'dotenv'
import { agentMediator } from '../src/veramoAgentMediator.js'

dotenv.config()
const anvilRpcUrl = process.env.ANVIL_RPC_URL ?? 'http://127.0.0.1:8545'

export async function setupTest(){
  // ------------------------------------------------------------------------------------------------------
  // ------------------------------------------- DID INIT -------------------------------------------------
  const didClient1 = process.env.ISSUER_DID 
  const didClient2 = process.env.HOLDER_DID 
  const didClient3 = process.env.VERIFIER_DID
  const didMediator = process.env.MEDIATOR_DID

  // ------------------------------------------------------------------------------------------------------------
  // ------------------------------------------- WALLETT INIT ---------------------------------------------------


  const addressClient1 = await findDIDAddress('holder1', agentClient1)
  const addressClient2 = await findDIDAddress('holder2', agentClient2)
  const addressClient3 = await findDIDAddress('holder3', agentClient3)
  const addressMediator = await findDIDAddress('mediator', agentMediator)
/*
** LOCAL ANVIL TESTS
  async function setBalance(address : string) {
    const provider = new JsonRpcProvider(anvilRpcUrl);
    const valueHex = "0x3635c9adc5dea00000";
    const result = await provider.send("anvil_setBalance", [address, valueHex]);
    console.log("setBalance result:", result);
    const bal = await provider.getBalance(address);
    console.log("new balance:", bal.toString());
  }

  await setBalance(addressClient1).catch(console.error);
  await setBalance(addressClient2).catch(console.error);
  await setBalance(addressClient3).catch(console.error);
  await setBalance(addressMediator).catch(console.error);
*/
  // --------------------------------------------------------------------------------------------------------
  // ------------------------------------------- KEY INIT -------------------------------------------------

  const kidClient1 = await addKeyToDID('holder1', agentClient1)
  const kidClient2 = await addKeyToDID('holder2', agentClient2)
  const kidClient3 = await addKeyToDID('holder3', agentClient3)
  const kidMediator = await addKeyToDID('mediator', agentMediator)

  // --------------------------------------------------------------------------------------------------------
  // ------------------------------------- DIDCOMM SERVICE INIT ---------------------------------------------
  async function setupService(service: any, agent: any): Promise<void> {
      try {
        await agent.didManagerAddService(service)
        console.log('Servizio configurato')
      } catch (error) {
        console.log('Errore:', error)
      }
  }
  const serviceMediator = {
    did: didMediator,
    service: {
          id: 'didcomm-1',
          type: "DIDCommMessaging",
          serviceEndpoint: {
              uri: "http://localhost:3000/didcomm",
          }
    }
  }
  await setupService(serviceMediator, agentMediator)
}



// --------------------------------------------------------------------------------------------------------
// --------------------------------------------- MAIN -----------------------------------------------------
const setupDids = await setupTest()

