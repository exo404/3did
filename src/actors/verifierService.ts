import { ISelectiveDisclosureRequest } from "@veramo/selective-disclosure"
import { SDJwt } from "@eengineer1/sd-jwt-ts-node" 

export interface Claims{
    subjectDID: string
    id: string
}

export interface UniversityClaims extends Claims{
  studentID: string,
  degreeType: string,
  degreeName: string,
  alumniOf: string,
  name: string,
  surname: string,
  email: string,
  phone: string,
  address: string,
  birthdate: string,
  documentID: string,
}

export async function verifyVC(agent: any, credential: any): Promise<boolean> {
  const result = await agent.verifyCredential({
    credential: credential
  })
  return result.verified
}

export async function verifySdJwt(agent: any, sdJwt: SDJwt): Promise<boolean> {
  const { verified, message } = await agent.verifyVerifiableCredentialSDJwt({
      credential: sdJwt.jwt,
  })
  return verified
}

/*------------------------------------------- VERAMO SELECTIVE DISCLOSURE -----------------------------
export async function createSdr(issuerDID: string, claims: any[] ): Promise<any> {
  const sdr = {
    data: {
      issuer: issuerDID,
      claims: claims,
    }
  }
  return sdr
}

export async function createSdrRequest(agent: any, sdr: any): Promise<string> {
  const sdrRequest = await agent.createSelectiveDisclosureRequest(sdr)
  return sdrRequest
}

export async function verifyVPAgainstSDR(agent: any, presentation: any, sdr: any): Promise<boolean> {
  const result = await agent.verifyPresentation({
    presentation: presentation
  })
  if (!result.verified) {
    return false
  }
  const validationResult = await agent.validatePresentationAgainstSdr({
    presentation: presentation,
    sdr: sdr
  })
  return validationResult.valid
}
-------------------------------------------------------------------------------------------------------------*/
export async function verifyVP(agent: any, presentation: any, sdr: any): Promise<boolean> {
  const result = await agent.verifyPresentation({
    presentation: presentation
  })
  return result.verified
}

export async function verifyVPSdjwt(agent: any, sdJwtPresentation: string): Promise<boolean>{
  const { verified, message } = await agent.verifyVerifiablePresentationSDJwt({
      presentation: sdJwtPresentation,
  })
  return verified
}




