import { agent } from './veramoAgent.js'
import { credential } from './testCredential.js'

export async function verifyVC() {
  const result = await agent.verifyCredential({
    credential: credential
  })
  if (result.verified) {
    console.log(`Credential verified`)
  } else {
    console.log(`Credential not verified`)
  }
}
