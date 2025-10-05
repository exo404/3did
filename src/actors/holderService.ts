import { IIdentifier } from '@veramo/core'

export async function createDID(alias: string, agent : any): Promise<string>{
  try {
    console.log(`Creazione nuovo DID per alias "${alias}"...`)

    const identifier = await agent.didManagerCreate({ 
      alias,
      provider: 'did:ethr:sepolia',
      kms: 'local'
    })
    console.log(`DID: ${identifier.did}`)
    return identifier.did

  } catch (error) {
    console.error(`Errore nella gestione del DID per alias "${alias}":`, error)
    throw error
  }
}

export async function addKeyToDID(alias: string, agent: any): Promise<string> {
  try {
    const existing = await agent.didManagerFind({ alias })
    console.log(`Aggiungo chiave X25519 al DID: ${existing[0].did}`)

    const x25519Key = await agent.keyManagerCreate({
      kms: 'local',
      type: 'X25519',
    })
    await agent.didManagerAddKey({
      did: existing[0].did,
      key: x25519Key,
    })

    console.log(`Chiave X25519 aggiunta: ${x25519Key.kid}`)
    return x25519Key.kid
  } catch (error) {
    console.error(`Errore nell'aggiunta della chiave al DID "${alias}":`, error)
    throw error
  }
}
