import {agent as agentIssuer} from '../src/veramoAgentHolder1.js' 
import {agent as agentHolder} from '../src/veramoAgentHolder2.js'
import {agent as agentVerifier} from '../src/veramoAgentHolder3.js'
import { v4 as uuidv4 } from 'uuid'
import {UniversityClaims, verifySdJwt, verifyVPSdjwt} from '../src/actors/verifierService.js'
import { createSDJWT } from '../src/actors/issuerService.js'
import { createSdJwtPresentation } from '../src/actors/holderService.js'
import {DIDCommBodyTypes, handleDIDCommMessage, receiveDIDCommMessages, sendDIDCommMessage, sendMediateRequestV3, sendRecipientUpdateV3 } from '../src/actors/recipient.js'

const issuerDID = 'did:ethr:sepolia:0x03c1a4ad1e5ffb93f2ea857f6098d7a88bc2b3b32e962566a8cf8408a70e368622';
const holderDID = 'did:ethr:sepolia:0x0328e71d30dd823fa8afffe2a595326c0ac99eb1ff5254ac26c38a57c2e42093de';
const verifierDID = 'did:ethr:sepolia:0x022235534d4ae813ca5359b1ea99d35a1325bb179ada324de878c4a0aeb7ae24fa';
const mediatorDID = 'did:ethr:sepolia:0x03be9e926c02c390c6228e9b6f5fdf0d6338ecabe4b093390fa8592703872c75ca';

const claims : UniversityClaims = {
  subjectDID: holderDID,
  id : uuidv4(),
  studentID: 'M63001777',
  degreeType: 'LM-32',
  degreeName: 'Laurea Magistrale in Ingegneria Informatica',
  alumniOf: 'Università degli Studi di Napoli Federico II',
  name: 'Alberto',
  surname: 'Petillo',
  email: 'albertopetillo@hotmail.it',
  phone: '+393347774441',
  address: 'Via della Libertà, 777, Napoli, Italia',
  birthdate: '07/05/2002',
  documentID: '3V1T14M0'
}

const undisclosedClaims = {
  id: claims.id,
  subjectDID: claims.subjectDID,
  phone: claims.phone,
  address: claims.address,
  birthdate: claims.birthdate,
  documentID: claims.documentID
} 

// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------- REGISTRATION ---------------------------------------------------


await sendMediateRequestV3(agentIssuer, issuerDID, mediatorDID, 'issuer-mediate-req')
await sendMediateRequestV3(agentHolder, holderDID, mediatorDID, 'holder-mediate-req')
await sendMediateRequestV3(agentVerifier, verifierDID, mediatorDID, 'verifier-mediate-req')
await sendRecipientUpdateV3(issuerDID, agentIssuer, mediatorDID, 'issuer-recipient-update')
await sendRecipientUpdateV3(holderDID, agentHolder, mediatorDID, 'holder-recipient-update')
await sendRecipientUpdateV3(verifierDID, agentVerifier, mediatorDID, 'verifier-recipient-update')

/* ----------------------------------------------- VERAMO SELECTIVE DISCLOSURE ------------------------------------------------------
const claimsForSdr = [
    {
        claimType: 'degreeType',
        reason: 'We need to know your degree type',
        essential: true
    },
    {
        claimType: 'degreeName',
        reason: 'We need to know your degree name'
    },
    {
        claimType: 'studentID',
        reason: 'We need to know your student ID',
        essential: true
    },
    {
        claimType: 'alumniOf',
        reason: 'We need to know your institution',
        essential: true
    }
]
const credential = await createVC(agentIssuer, claims, issuerDID)
await sendDIDCommMessage(issuerDID, holderDID, credential, DIDCommBodyTypes.CREDENTIAL_ISSUE, agentIssuer)
const messages = await receiveDIDCommMessages(holderDID, agentHolder, mediatorDID)
for (const msg of messages) {
  await handleDIDCommMessage(msg, agentHolder)
}
const sdr = await createSdr(verifierDID, claimsForSdr)
const sdrRequest = await createSdrRequest(agentVerifier, sdr)
await sendDIDCommMessage(verifierDID, holderDID, sdrRequest, DIDCommBodyTypes.SDR_REQUEST, agentVerifier)
const messages2 = await receiveDIDCommMessages(holderDID, agentHolder, mediatorDID)
for (const msg of messages2) {
  await handleDIDCommMessage(msg, agentHolder)
}
---------------------------------------------------------------------------------------------------------------------------------- */

// -------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------- CREATE VC FROM ISSUER TO HOLDER ---------------------------------------------------
const sdJwt = await createSDJWT(agentIssuer, claims, undisclosedClaims, issuerDID)
await sendDIDCommMessage(issuerDID, holderDID, sdJwt, DIDCommBodyTypes.CREDENTIAL_ISSUE, agentIssuer, 'issuer-credential-issue')
const messages = await receiveDIDCommMessages(holderDID, agentHolder, mediatorDID, 'holder-receive-credential')
for (const msg of messages) {
  await handleDIDCommMessage(msg, agentHolder)
}
// ----------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------- CREATE VP FROM HOLDER TO VERIFIER ----------------------------------------------------
const sdJwtPresentation = await createSdJwtPresentation(agentHolder, holderDID, sdJwt)
await sendDIDCommMessage(holderDID, verifierDID, sdJwtPresentation, DIDCommBodyTypes.PRESENTATION, agentHolder, 'holder-presentation')
const messages3 = await receiveDIDCommMessages(verifierDID, agentVerifier, mediatorDID, 'verifier-receive-presentation')
for (const msg of messages3) {
  await handleDIDCommMessage(msg, agentVerifier)
}




