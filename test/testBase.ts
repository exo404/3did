import { verifyVC } from "../src/verifierService.js";  
import { createVC } from "../src/issuerService.js";
import { createDID } from "../src/holderService.js";
import { agent } from "../src/veramoAgent.js";
import { ethers } from 'ethers'

const aliasServer = 'default'
const aliasSender = 'test-sender9'
const serverDID = 'did:ethr:sepolia:0x035f3fd0cbb46d747c8e810fa371b4dd1f5e68d7dd035cfc0bbde2ea9e63e939e6'
const senderDID = 'did:ethr:sepolia:0x029741c1ed91433bf5db3702f15d5a71f8e229851b196c3d7088060e956776c537'


async function testV1() {
   const identifier = await createDID(aliasServer);
   console.log("Created DID:", identifier.did);
   await createVC();
   await verifyVC();
}

export async function findDIDAddress(alias: string) {
  try {
    const identifiers = await agent.didManagerFind({ alias })
    if (identifiers.length === 0) {
      console.log(`DID with alias '${alias}' not found`)
      return
    }
    
    const identifier = identifiers[0]
    console.log(`DID: ${identifier.did}`)
    console.log(`Controller Key ID: ${identifier.controllerKeyId}`)
    
    // Trovo la chiave di controllo
    const controllerKey = identifier.keys.find(key => key.kid === identifier.controllerKeyId)
    
    if (controllerKey && controllerKey.publicKeyHex) {
      // Derivo l'address dalla public key
      const publicKey = controllerKey.publicKeyHex
      console.log(`Public Key: ${publicKey}`)
      
      // Se è una public key non compressa (130 caratteri)
      if (publicKey.length === 130) {
        const address = ethers.computeAddress('0x' + publicKey)
        console.log(`Ethereum Address: ${address}`)
        console.log(`Use this address in the faucet: ${address}`)
        return address
      }
    }
  } catch (error) {
    console.error('Error finding address:', error.message)
  }
}
await testV1()
await findDIDAddress(aliasServer)