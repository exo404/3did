import { Claims } from "./verifierService.js"
import { v4 as uuidv4 } from 'uuid'

export async function createVC(agent: any, credentialSubject: Claims, issuerDID: string): Promise<Credential> {
  // Create a new verifiable credential
  const credential = await agent.createVerifiableCredential({
    credential: {
      // Required fields
      id: uuidv4(),
      issuer: issuerDID,
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      credentialSubject: credentialSubject,
      // Optional fields
      issuanceDate: new Date().toISOString(),
      validFrom: new Date().toISOString(),
    },
    // Options
    proofFormat: 'jwt', 
    save: false, 
  })
  return credential
}
