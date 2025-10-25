import { Claims } from "./verifierService.js"
import { v4 as uuidv4 } from 'uuid'
import { SDJwt, type JSONObject } from '@eengineer1/sd-jwt-ts-node'

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

export async function createSDJWT(agent: any, credentialClaims: Claims, undisclosedClaims : any, issuerDID: string): Promise<SDJwt> {
  const claimset = {
    id: uuidv4(),
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    issuer: issuerDID,
    credentialSubject: credentialClaims
  }
  const undisclosedClaimset = {
    '@context': claimset['@context'],
    type: claimset.type,
    issuanceDate: new Date().toISOString(),
    credentialSubject: undisclosedClaims
  } satisfies JSONObject

  const { sdJwt, normalisedCredential } = await agent.createVerifiableCredentialSDJwt({
      credential: claimset,
      undisclosedFields: undisclosedClaimset,
      removeOriginalFields: true,
      returnNormalisedCredential: true,
  })
  return sdJwt
}