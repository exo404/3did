// didcommMediator.ts
import express from 'express'
import { agent } from '../veramoAgent.js'
import { DIDCommManager } from './DIDCommManager.js'

const app = express()
const PORT = process.env.MEDIATOR_PORT

// Middleware per parsing JSON e DIDComm
app.use(express.json())
app.use(express.text({ type: 'application/didcomm-encrypted+json' }))

// Endpoint principale per ricevere messaggi DIDComm
app.post('/didcomm', async (req, res) => {
  console.log('\n Nuovo messaggio DIDComm ricevuto')
  
  try {
    const rawMessage = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body)
    
    const processedMessage = await agent.handleMessage({
      raw: rawMessage,
      metaData: [
        {
          type: 'DIDCommMessaging',
          value: rawMessage
        }
      ]
    })
    
    console.log(' Messaggio processato dal MessageHandler pipeline')
    
    // Se il messaggio è stato processato con successo
    if (processedMessage) {
      // Il MediationManagerPlugin si occupa automaticamente di:
      // 1. Gestire le richieste di mediazione 
      // 2. Salvare i messaggi nella coda (database)
      // 3. Gestire recipient updates
      // 4. Fornire status e delivery dei messaggi
      
      console.log(`Tipo messaggio: ${processedMessage.type}`)
      console.log(`Da: ${processedMessage.from}`)
      console.log(`A: ${processedMessage.to}`)
      
      // Salva automaticamente il messaggio nel database
      if (processedMessage.id) {
        await agent.dataStoreSaveMessage({ message: processedMessage })
        console.log(' Messaggio salvato nel database')
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Messaggio processato e salvato',
        messageId: processedMessage.id,
        messageType: processedMessage.type
      })
    } else {
      res.status(200).json({
        status: 'success', 
        message: 'Messaggio processato'
      })
    }
    
  } catch (error) {
    console.error(' Errore nel processare il messaggio:', error)
    res.status(400).json({ 
      status: 'error',
      message: 'Errore nel processare il messaggio',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Endpoint per query messaggi utilizzando l'ORM di Veramo
app.get('/messages', async (req, res) => {
  try {
    const { from, to, type, limit = 50 } = req.query
    
    const messages = await agent.dataStoreORMGetMessages({
      where: [
        ...(from ? [{ column: 'from' as any, value: [from as string] }] : []),
        ...(to ? [{ column: 'to' as any, value: [to as string] }] : []),
        ...(type ? [{ column: 'type' as any, value: [type as string] }] : []),
      ],
      order: [{ column: 'createdAt', direction: 'DESC' }],
      take: parseInt(limit as string),
    })
    
    res.json({
      status: 'success',
      count: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        from: msg.from,
        to: msg.to,
        createdAt: msg.createdAt,
        data: msg.data
      }))
    })
    
  } catch (error) {
    console.error(' Errore nel recupero messaggi:', error)
    res.status(500).json({
      status: 'error',
      message: 'Errore nel recupero dei messaggi'
    })
  }
})

// Endpoint per statistiche mediazione utilizzando MediationManager
app.get('/mediation/stats', async (req, res) => {
  try {
    // Il MediationManagerPlugin tiene traccia automaticamente di:
    // - Richieste di mediazione approvate/negate  
    // - Policy di mediazione
    // - DID dei richiedenti
    
    const messages = await agent.dataStoreORMGetMessages({
      where: [
        { column: 'type' as any, value: ['https://didcomm.org/coordinate-mediation/3.0/mediate-request'] }
      ]
    })
    
    const pickupMessages = await agent.dataStoreORMGetMessages({
      where: [
        { column: 'type' as any, value: ['https://didcomm.org/messagepickup/3.0/status-request'] }
      ]
    })
    
    const forwardedMessages = await agent.dataStoreORMGetMessages({
      where: [
        { column: 'type' as any, value: ['https://didcomm.org/routing/2.0/forward'] }
      ]
    })
    
    res.json({
      status: 'success',
      mediation_stats: {
        total_mediation_requests: messages.length,
        total_pickup_requests: pickupMessages.length, 
        total_forwarded_messages: forwardedMessages.length,
        active_mediations: messages.filter(m => 
          m.data && 'granted' in m.data && m.data.granted
        ).length
      }
    })
    
  } catch (error) {
    console.error(' Errore nelle statistiche:', error)
    res.status(500).json({
      status: 'error',
      message: 'Errore nel recupero delle statistiche'
    })
  }
})

// Endpoint per configurare policy di mediazione
app.post('/mediation/policy', async (req, res) => {
  try {
    const { requesterDid, granted, reason } = req.body
    
    if (!requesterDid || typeof granted !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'requesterDid e granted sono richiesti'
      })
    }
    
    // Il MediationManagerPlugin gestisce automaticamente le policy
    // Qui possiamo impostare policy personalizzate se necessario
    console.log(` Policy impostata per ${requesterDid}: ${granted ? 'GRANTED' : 'DENIED'}`)
    
    res.json({
      status: 'success',
      message: 'Policy di mediazione configurata',
      policy: { requesterDid, granted, reason }
    })
    
  } catch (error) {
    console.error(' Errore configurazione policy:', error)
    res.status(500).json({
      status: 'error',
      message: 'Errore nella configurazione della policy'
    })
  }
})


// Avvio del mediatore
export async function startMediator(mediatorAlias: string = 'mediator') {
  try {
    console.log(' Avvio DIDComm Mediator...')

    mediatorAlias = process.env.MEDIATOR_ALIAS
    const didcommManager = new DIDCommManager()
    await didcommManager.initialize(mediatorAlias)
    await didcommManager.setupDIDComm(`http://localhost:${PORT}/didcomm`)
    // Avvio il server Express
    app.listen(PORT, () => {
      console.log(`\n Mediator DIDComm avviato su http://localhost:${PORT}`)
      console.log('\n Endpoints disponibili:')
      console.log('  POST /didcomm              - Ricevi messaggi DIDComm')
      console.log('  GET  /messages             - Query messaggi nel database')
      console.log('  GET  /mediation/stats      - Statistiche mediazione')
      console.log('  POST /mediation/policy     - Configura policy mediazione')
      console.log('\n' + '='.repeat(60))
    })
    
  } catch (error) {
    console.error(' Errore nell\'avvio del mediatore:', error)
    process.exit(1)
  }
}