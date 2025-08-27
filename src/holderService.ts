import { IIdentifier } from '@veramo/core'
import { agent } from './veramoAgent.js'

export async function createDID(alias : string) : Promise<IIdentifier> {
  const newKey = await agent.keyManagerCreate({
    kms: 'local',
    type: 'X25519',
  })
  const identifier = await agent.didManagerCreate({ alias })

  await agent.didManagerAddKey({
    did: identifier.did,
    key: newKey,
  })

  console.log(`New DID: ${identifier.did}`)
  console.log(JSON.stringify(identifier, null, 2))
  return identifier
}
