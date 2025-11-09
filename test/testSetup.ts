import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import {agent as agentClient1} from '../src/veramoAgentHolder1.js'
import {agent as agentClient2} from '../src/veramoAgentHolder2.js'
import {agent as agentClient3} from '../src/veramoAgentHolder3.js'
import {agentMediator } from '../src/veramoAgentMediator.js'
import { addKeyToDID, createDID } from '../src/actors/holderService.js'
import { findDIDAddress } from './utils.js'
import { JsonRpcProvider } from "ethers";
import dotenv from 'dotenv'

dotenv.config()
const anvilRpcUrl = process.env.ANVIL_RPC_URL ?? 'http://127.0.0.1:8545'

export async function setupTest() : Promise<string []>{
  // ------------------------------------------------------------------------------------------------------
  // ------------------------------------------- DID INIT -------------------------------------------------

  const didMediator = await createDID('mediator', agentMediator)
  const didClient1 = await createDID('holder1', agentClient1)
  const didClient2 = await createDID('holder2', agentClient2)
  const didClient3 = await createDID('holder3', agentClient3)

  // ------------------------------------------------------------------------------------------------------------
  // ------------------------------------------- WALLETT INIT ---------------------------------------------------


  const addressClient1 = await findDIDAddress('holder1', agentClient1)
  const addressClient2 = await findDIDAddress('holder2', agentClient2)
  const addressClient3 = await findDIDAddress('holder3', agentClient3)
  const addressMediator = await findDIDAddress('mediator', agentMediator)

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

  // --------------------------------------------------------------------------------------------------------
  // ------------------------------------------- KEY INIT -------------------------------------------------

  const kidMediator = await addKeyToDID('mediator', agentMediator)
  const kidClient1 = await addKeyToDID('holder1', agentClient1)
  const kidClient2 = await addKeyToDID('holder2', agentClient2)
  const kidClient3 = await addKeyToDID('holder3', agentClient3)

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
  const serviceClient = {
    did: didClient,
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
  // await setupService(serviceClient, agentClient)
  return [didMediator, didClient1, didClient2, didClient3]
}


function updateEnvFile([mediatorDid, holder1Did, holder2Did, holder3Did]: string[]): void {
  const __filename = fileURLToPath(import.meta.url)
  const envPath = path.resolve(path.dirname(__filename), '..', '.env')

  const existing = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
    : []

  const ensure = (lines: string[], key: string, value: string): string[] => {
    const assignment = `${key}=${value}`
    const index = lines.findIndex((line) => line.startsWith(`${key}=`))
    if (index >= 0) {
      lines[index] = assignment
      return lines
    }
    return [...lines, assignment]
  }

  let updated = existing.filter((line) => line.trim().length > 0)
  updated = ensure(updated, 'MEDIATOR_DID', mediatorDid)
  updated = ensure(updated, 'ISSUER_DID', holder1Did)
  updated = ensure(updated, 'HOLDER_DID', holder2Did)
  updated = ensure(updated, 'VERIFIER_DID', holder3Did)

  fs.writeFileSync(envPath, `${updated.join('\n')}\n`, 'utf-8')
  console.log(`Aggiornato .env: ${envPath}`)
}


// --------------------------------------------------------------------------------------------------------
// --------------------------------------------- MAIN -----------------------------------------------------
const setupDids = await setupTest()
updateEnvFile(setupDids)
