import {agent as agentClient1} from '../src/veramoAgentClient1.js' 
import {agent as agentClient2} from '../src/veramoAgentClient2.js' 
import {agentMediator } from '../src/veramoAgentMediator.js'
import dotenv from 'dotenv'
import { ethers } from 'ethers'

dotenv.config()

export async function findDIDAddress(alias: string, agent : any) {
  try {
    const identifiers = await agent.didManagerFind({ alias })
    for (let index = 0; index < identifiers[0].keys.length; index++) {
      const element = identifiers[0].keys[index];
    }

    if (identifiers.length === 0) {
      return
    }
    
    const identifier = identifiers[0]
    
    // Trovo la chiave di controllo
    const controllerKey = identifier.keys.find(key => key.kid === identifier.controllerKeyId)
    
    if (controllerKey && controllerKey.publicKeyHex) {
      // Derivo l'address dalla public key
      const publicKey = controllerKey.publicKeyHex
      
      // Se è una public key non compressa (130 caratteri)
      if (publicKey.length === 130) {
        const address = ethers.computeAddress('0x' + publicKey)
        return address
      }
    }

  } catch (error) {
    console.error('Error finding address:', error.message)
  }
}

export async function printDID(alias: string, agent : any) {
  try {
    const identifiers = await agent.didManagerFind({ alias })
    for (let index = 0; index < identifiers[0].keys.length; index++) {
      const element = identifiers[0].keys[index];
    }

    if (identifiers.length === 0) {
      return
    }
    
    const identifier = identifiers[0]
    
    console.log(`DID for ${alias}: ${identifier.did}`)
    console.log('Service Endpoints:', identifier.service)

  } catch (error) {
    console.error('Error finding address:', error.message)
  }
}

export async function listMessages(agent: any) : Promise<any[]> {
  try {
    const messages = await agent.dataStoreORMGetMessages()
    let i = 0
    messages.forEach(msg => {
      i++
      console.log(`Message ${i}: ${msg.id} - Type: ${msg.type} - From: ${msg.from} - To: ${msg.to} - ThreadID: ${msg.threadId}`)
    })
    return messages
  }
  catch (error) {
    console.error('Error listing messages:', error.message)
    return []
  }
}