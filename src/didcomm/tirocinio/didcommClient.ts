import express from 'express'
import { DIDCommManager } from './DIDCommManager.js'
import { agent } from './veramoAgentClient.js'

const app = express()

// Middleware per parsing JSON
app.use(express.json())
app.use(express.text())

// Istanza del manager DIDComm
const didcommManager = new DIDCommManager()

app.post('/receive-messages', async (req, res) => {
  console.log('\n Richiesta ricezione messaggi')
  
  try {
    const { did } = req.body
    if (!did) {
      return res.status(400).json({
        status: 'error',
        message: 'DID richiesto'
      })
    }
    
    const messages = await didcommManager.receiveMessages(did);
    console.log(`Ricevuti ${messages.length} messaggi`)

    for (const msg of messages) {
      console.log('Messaggio elaborato:', JSON.stringify(msg, null, 2))
    }
    
    res.status(200).json({ 
      status: 'success',
      message: 'Messaggi ricevuti e processati',
      count: messages.length,
      messages
    })
    
  } catch (error) {
    console.error('Errore nel processare i messaggi:', error)
    res.status(400).json({ 
      status: 'error',
      message: 'Errore nel processare i messaggi',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Endpoint per inviare un messaggio a un altro agente
app.post('/send-message', async (req, res) => {
  try {
    const { senderDID, recipientDID, body } = req.body
    
    if (!recipientDID || !senderDID || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'Parametri mancanti: recipientDID, messageType, body sono richiesti'
      })
    }
    
    const result = await didcommManager.sendMessageMediator(
      senderDID,
      recipientDID,
      body
    )

    console.log(' Messaggio inviato con risultato:', result.returnMessage)
    
    res.json({
      status: 'success',
      message: 'Messaggio inviato',
      result
    })
    
  } catch (error) {
    console.error(' Errore nell\'invio del messaggio:', error)
    res.status(500).json({
      status: 'error',
      message: 'Errore nell\'invio del messaggio',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})


// Endpoint per confermare la lettura di un messaggio
app.post('/confirm-read', async (req, res) => {
  try {
    const messageID = req.body

    if (!messageID) {
      return res.status(400).json({
        status: 'error',
        message: 'Parametri mancanti: senderDID e messageID sono richiesti'
      })
    }

    await didcommManager.markMessageAsRead(messageID)

    res.json({
      status: 'success',
      message: 'Messaggio contrassegnato come letto'
    })

  } catch (error) {
    console.error('Errore nella conferma dei messaggi:', error)
    res.status(500).json({
      status: 'error',
      message: 'Errore nella conferma dei messaggi',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Endpoint per recuperare tutti i messaggi salvati
app.get('/messages', async (req, res) => {
  try {
    const messages = await didcommManager.getStoredMessages()
    res.json({
      total: messages.length,
      messages
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Errore nel recuperare i messaggi'
    })
  }
})


// Avvio il server e inizializza l'agente
export async function startClient(clientAlias : string, port: number) {
  try {
    // Inizializzo il manager DIDComm
    console.log(' Inizializzazione DIDComm Manager...')
    const mediatorDID = await agent.didManagerFind({ alias: process.env.MEDIATOR_ALIAS })
    await didcommManager.initialize(clientAlias, mediatorDID ? mediatorDID[0].did : '')
    await didcommManager.setupDIDCommMediator(`http://localhost:${process.env.MEDIATOR_PORT}/didcomm`, [mediatorDID ? mediatorDID[0].did : ''])

    // Avvio il server Express
    app.listen(port, () => {
      console.log(`\nServer DIDComm avviato su http://localhost:${port}`)
      console.log(`Endpoint messaggi: http://localhost:${port}/messaging`)
      console.log(`DID dell'agente: ${didcommManager.getDID()}`)
      console.log('\nEndpoints disponibili:')
      console.log('  POST /receive-messages - Ricevi messaggi DIDComm')
      console.log('  POST /send-message     - Invia un messaggio')
      console.log('  POST /confirm-read     - Conferma lettura messaggio')
      console.log('  GET  /messages         - Lista messaggi salvati')
      console.log('\n' + '='.repeat(50))
    })
    
  } catch (error) {
    console.error('Errore nell\'avvio del server:', error)
    process.exit(1)
  }
}
