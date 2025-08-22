import { agent } from './veramoAgent.js'

export async function createDID() {
  const identifier = await agent.didManagerCreate({ alias: 'default' })
  console.log(`New DID`)
  console.log(JSON.stringify(identifier, null, 2))
}