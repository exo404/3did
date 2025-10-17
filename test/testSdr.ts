import {agent as agentIssuer} from '../src/veramoAgentHolder1.js' 
import {agent as agentHolder} from '../src/veramoAgentHolder2.js'
import {agent as agentVerifier} from '../src/veramoAgentHolder3.js'
import { v4 as uuidv4 } from 'uuid'
import {UniversityClaims} from '../src/actors/verifierService.js'
import { createVC } from '../src/actors/issuerService.js'
import {DIDCommBodyTypes, handleDIDCommMessage, receiveDIDCommMessages, sendDIDCommMessage, sendMediateRequestV3, sendRecipientUpdateV3 } from '../src/actors/recipient.js'

const issuerDID = 'did:ethr:sepolia:0x02ef3331beb1629cee28399e31d83b28f32217798afc8219ccf2033012adf1d22a';
const holderDID = 'did:ethr:sepolia:0x03701e98d0f5d255ae2781023087ef09a00a2f0459f78d162db920f83b063fbe7e';
const verifierDID = 'did:ethr:sepolia:0x023491e72aa01c1fe83d81218ac77f3440efda309c81d7ab4884b53226f7e2dc32';
const mediatorDID = 'did:ethr:sepolia:0x034c4e4267b21021c7a8b8066091f1660f752af1e3c8398eda656c8ed4d0fdeeba';

const claims : UniversityClaims = {
    subjectDID: holderDID,
    id : uuidv4(),
    studentID: 'M63001604',
    degreeType: 'LM-32',
    degreeName: 'Laurea Magistrale in Ingegneria Informatica',
    alumniOf: 'Università degli Studi di Napoli Federico II',
    name: 'Alberto',
    surname: 'Petillo',
    email: 'albertopetillo@hotmail.it',
    phone: '+393349300837',
    address: 'Via Libertà 134, 80055 Portici (NA), Italia',
    birthdate: '07/05/2002',
    documentID: '3V1T14M0'
}

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

// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------- REGISTRATION ---------------------------------------------------

await sendMediateRequestV3(agentIssuer, issuerDID, mediatorDID)
await sendMediateRequestV3(agentHolder, holderDID, mediatorDID)
await sendMediateRequestV3(agentVerifier, verifierDID, mediatorDID)
await sendRecipientUpdateV3(issuerDID, agentIssuer, mediatorDID)
await sendRecipientUpdateV3(holderDID, agentHolder, mediatorDID)
await sendRecipientUpdateV3(verifierDID, agentVerifier, mediatorDID)

// -------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------- CREATE VC FROM ISSUER TO HOLDER ---------------------------------------------------

const credential = await createVC(agentIssuer, claims, issuerDID)
await sendDIDCommMessage(issuerDID, holderDID, credential, DIDCommBodyTypes.CREDENTIAL_ISSUE, agentIssuer)
const messages = await receiveDIDCommMessages(holderDID, agentHolder, mediatorDID)
for (const msg of messages) {
  await handleDIDCommMessage(msg, agentHolder)
}

/* ----------------------------------------------- VERAMO SELECTIVE DISCLOSURE ------------------------------------------------------
// ------------------------------------------- CREATE SDR FROM VERIFIER TO HOLDER ---------------------------------------------------

const sdr = await createSdr(verifierDID, claimsForSdr)
const sdrRequest = await createSdrRequest(agentVerifier, sdr)
await sendDIDCommMessage(verifierDID, holderDID, sdrRequest, DIDCommBodyTypes.SDR_REQUEST, agentVerifier)
const messages2 = await receiveDIDCommMessages(holderDID, agentHolder, mediatorDID)
for (const msg of messages2) {
  await handleDIDCommMessage(msg, agentHolder)
}
---------------------------------------------------------------------------------------------------------------------------------- */

// ------------------------------------------- CREATE SDR FROM VERIFIER TO HOLDER ---------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------------------------

// ------------------------------------------- CREATE VP FROM HOLDER TO VERIFIER ----------------------------------------------------

const messages3 = await receiveDIDCommMessages(verifierDID, agentVerifier, mediatorDID)
for (const msg of messages3) {
  await handleDIDCommMessage(msg, agentVerifier)
}




