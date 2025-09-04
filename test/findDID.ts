import { agent } from '../src/veramoAgent.js'
import dotenv from 'dotenv'
import { ethers } from 'ethers'
dotenv.config()

const aliasMediator = process.env.MEDIATOR_ALIAS
const aliasClient1 = process.env.CLIENT_1_ALIAS
const aliasClient2 = process.env.CLIENT_2_ALIAS
const serverDID = 'did:ethr:sepolia:0x035f3fd0cbb46d747c8e810fa371b4dd1f5e68d7dd035cfc0bbde2ea9e63e939e6'
const senderDID = 'did:ethr:sepolia:0x029741c1ed91433bf5db3702f15d5a71f8e229851b196c3d7088060e956776c537'

export async function findDIDAddress(alias: string) {
  try {
    const identifiers = await agent.didManagerFind({ alias })
    console.log(`Identifiers found for alias '${alias}':`, identifiers)
    for (let index = 0; index < identifiers[0].keys.length; index++) {
      const element = identifiers[0].keys[index];
      console.log(`Key ${index}:`, element)
    }

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
console.log("Mediator:")
await findDIDAddress(aliasMediator)
console.log("Client 1:")
await findDIDAddress(aliasClient1)
console.log("Client 2:")
await findDIDAddress(aliasClient2)