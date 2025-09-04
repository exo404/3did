import { IIdentifier } from '@veramo/core'
import { agent } from '../veramoAgent.js'

export async function createDID(alias: string): Promise<IIdentifier> {
  try {

    const existing = await agent.didManagerFind({ alias })
    if (existing.length > 0) {
      console.log(`DID esistente trovato per alias "${alias}": ${existing[0].did}`)
      
      const identifier = existing[0]
      
      // Verifica se ha chiavi X25519
      const hasX25519 = identifier.keys.some(k => k.type === 'X25519')
      if (!hasX25519) {
        console.log(`Aggiungo chiave X25519 al DID esistente...`)
        const x25519Key = await agent.keyManagerCreate({
          kms: 'local',
          type: 'X25519',
        })
        await agent.didManagerAddKey({
          did: identifier.did,
          key: x25519Key,
        })
        
        console.log(`Chiave X25519 aggiunta: ${x25519Key.kid}`)
      }
      
      return identifier
    }
    console.log(`Creazione nuovo DID per alias "${alias}"...`)

    const x25519Key = await agent.keyManagerCreate({
      kms: 'local',
      type: 'X25519',
    })
    const identifier = await agent.didManagerCreate({ 
      alias,
      provider: 'did:ethr:sepolia',
      kms: 'local'
    })
    await agent.didManagerAddKey({
      did: identifier.did,
      key: x25519Key,
    })
    
    console.log(`Nuovo DID: ${identifier.did}`)
    console.log(`Chiave X25519: ${x25519Key.kid}`)
    console.log(JSON.stringify(identifier, null, 2))
    
    return identifier
    
  } catch (error) {
    console.error(`Errore nella gestione del DID per alias "${alias}":`, error)
    throw error
  }
}