import { agent } from './veramoAgent.js'

export async function createVC() {
  const identifier = await agent.didManagerGetByAlias({ alias: 'default' })

  const verifiableCredential = await agent.createVerifiableCredential({
    credential: {
      issuer: { id: identifier.did },
      credentialSubject: {
        id: 'did:ethr:exo404.com',
        you: 'exo404',
      },
    },
    proofFormat: 'jwt',
  })
  console.log(`New VC created`)
  console.log(JSON.stringify(verifiableCredential, null, 2))
}
