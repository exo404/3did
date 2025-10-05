import { agentMediator} from '../veramoAgentMediator.js'
import { agent as agentClient1} from '../veramoAgentHolder1.js'
import { agent as agentClient2} from '../veramoAgentHolder2.js'

export async function verifyVC(agent: any, credential: any) {
  const result = await agent.verifyCredential({
    credential: credential
  })
  if (result.verified) {
    console.log(`Credential verified`)
  } else {
    console.log(`Credential not verified`)
  }
}
