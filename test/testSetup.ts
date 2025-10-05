import {agent as agentClient1} from '../src/veramoAgentHolder1.js'
import {agent as agentClient2} from '../src/veramoAgentHolder2.js'
import {agentMediator } from '../src/veramoAgentMediator.js'
import { addKeyToDID, createDID } from '../src/actors/holderService.js'
import { findDIDAddress } from './utils.js'
import { JsonRpcProvider } from "ethers";

export async function setupTest() : Promise<string []>{
  // ------------------------------------------------------------------------------------------------------
  // ------------------------------------------- DID INIT -------------------------------------------------

  const didMediator = await createDID('mediator', agentMediator)
  const didClient1 = await createDID('holder1', agentClient1)
  const didClient2 = await createDID('holder2', agentClient2)

  // ------------------------------------------------------------------------------------------------------------
  // ------------------------------------------- WALLETT INIT ---------------------------------------------------


  const addressClient1 = await findDIDAddress('holder1', agentClient1)
  const addressClient2 = await findDIDAddress('holder2', agentClient2)
  const addressMediator = await findDIDAddress('mediator', agentMediator)

  async function setBalance(address : string) {
    const provider = new JsonRpcProvider("http://127.0.0.1:8545");
    const valueHex = "0x3635c9adc5dea00000";
    const result = await provider.send("anvil_setBalance", [address, valueHex]);
    console.log("setBalance result:", result);
    const bal = await provider.getBalance(address);
    console.log("new balance:", bal.toString());
  }

  await setBalance(addressClient1).catch(console.error);
  await setBalance(addressClient2).catch(console.error);
  await setBalance(addressMediator).catch(console.error);

  // --------------------------------------------------------------------------------------------------------
  // ------------------------------------------- KEY INIT -------------------------------------------------

  const kidMediator = await addKeyToDID('mediator', agentMediator)
  const kidClient1 = await addKeyToDID('holder1', agentClient1)
  const kidClient2 = await addKeyToDID('holder2', agentClient2)

  // --------------------------------------------------------------------------------------------------------
  // ------------------------------------- DIDCOMM SERVICE INIT ---------------------------------------------

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
  /*
  const serviceClient1 = {
    did: didClient1,
    service: {
      id: 'didcomm-1',
      type: 'DIDCommMessaging',
      serviceEndpoint: {
        uri: 'http://localhost:3000/didcomm', 
        routingKeys: [
          `${didMediator}#${kidMediator}`
        ],
      },
    },
  }


  const serviceClient2 = {
    did: didClient2,
    service: {
      id: 'didcomm-1',
      type: 'DIDCommMessaging',
      serviceEndpoint: {
        uri: 'http://localhost:3000/didcomm', 
        routingKeys: [
          `${didMediator}#${kidMediator}`
        ],
      },
    },
  }
  */
  async function setupService(service: any, agent: any): Promise<void> {
      try {
        await agent.didManagerAddService(service)
        console.log('Servizio configurato')
      } catch (error) {
        console.log('Errore:', error)
      }
  }

  await setupService(serviceMediator, agentMediator)
  // await setupService(serviceClient1, agentClient1)
  // await setupService(serviceClient2, agentClient2)
  return [didMediator, didClient1, didClient2]
}


// --------------------------------------------------------------------------------------------------------
// --------------------------------------------- MAIN -----------------------------------------------------
const setupDids = await setupTest()
export const mediatorDID = setupDids[0]
export const holder1DID = setupDids[1]
export const holder2DID = setupDids[2]
