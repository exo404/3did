import { agentMediator} from '../veramoAgentMediator.js'
import { agent as agentClient1} from '../veramoAgentHolder1.js'
import { agent as agentClient2} from '../veramoAgentHolder2.js'

export async function createVC(agent: any) {
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
