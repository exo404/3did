import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import {agentMediator } from '../src/veramoAgentMediator.js'
import { addKeyToDID, createDID } from '../src/actors/holderService.js'
import { findDIDAddress } from './utils.js'
import { JsonRpcProvider } from "ethers";
import dotenv from 'dotenv'

dotenv.config()
const anvilRpcUrl = process.env.ANVIL_RPC_URL || "http://127.0.0.1:8545"

async function setupService(service: any, agent: any): Promise<void> {
      try {
        await agent.didManagerAddService(service)
        console.log('Servizio configurato')
      } catch (error) {
        console.log('Errore:', error)
      }
}

export async function setupTest() : Promise<string []>{
  // ------------------------------------------------------------------------------------------------------
  // ------------------------------------------- DID INIT -------------------------------------------------

  const didMediator = await createDID('mediator', agentMediator)

  // ------------------------------------------------------------------------------------------------------------
  // ------------------------------------------- WALLETT INIT ---------------------------------------------------

  const addressMediator = await findDIDAddress('mediator', agentMediator)

  async function setBalance(address : string) {
    const provider = new JsonRpcProvider(anvilRpcUrl);
    const valueHex = "0x3635c9adc5dea00000";
    const result = await provider.send("anvil_setBalance", [address, valueHex]);
    console.log("setBalance result:", result);
    const bal = await provider.getBalance(address);
    console.log("new balance:", bal.toString());
  }

  await setBalance(addressMediator).catch(console.error);

  // --------------------------------------------------------------------------------------------------------
  // ------------------------------------------- KEY INIT -------------------------------------------------

  const kidMediator = await addKeyToDID('mediator', agentMediator)

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
  await setupService(serviceMediator, agentMediator)
  return [didMediator]
}


function updateEnvFile([mediatorDid]: string[]): void {
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
  console.log(mediatorDid)

  fs.writeFileSync(envPath, `${updated.join('\n')}\n`, 'utf-8')
  console.log(`Aggiornato .env: ${envPath}`)
}


// --------------------------------------------------------------------------------------------------------
// --------------------------------------------- MAIN -----------------------------------------------------
const setupDids = await setupTest()
updateEnvFile(setupDids)
