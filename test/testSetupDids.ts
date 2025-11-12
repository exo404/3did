import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createDID } from '../src/actors/holderService.js'
import { agentMediator } from '../src/veramoAgentMediator.js'
import { agent as agentHolder1 } from '../src/veramoAgentHolder1.js'
import { agent as agentHolder2 } from '../src/veramoAgentHolder2.js'
import { agent as agentHolder3 } from '../src/veramoAgentHolder3.js'

dotenv.config()

const didMediator = await createDID('mediator', agentMediator)
const didIssuer = await createDID('holder1', agentHolder1)
const didHolder = await createDID('holder2', agentHolder2)
const didVerifier = await createDID('holder3', agentHolder3)

function updateEnvFile([mediatorDid, issuerDid, holderDid, verifierDid]: string[]): void {
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
  updated = ensure(updated, 'ISSUER_DID', issuerDid)
  updated = ensure(updated, 'HOLDER_DID', holderDid)
  updated = ensure(updated, 'VERIFIER_DID', verifierDid)
  updated = ensure(updated, 'MEDIATOR_DID', mediatorDid)

  fs.writeFileSync(envPath, `${updated.join('\n')}\n`, 'utf-8')
  console.log(`Aggiornato .env: ${envPath}`)
}

const setupDids = [didMediator, didIssuer, didHolder, didVerifier]
updateEnvFile(setupDids)