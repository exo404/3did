import express from 'express'
import { DIDCommManager } from './didcommService.js'

const app = express()
const PORT = 3000

// Middleware per parsing JSON
app.use(express.json())
app.use(express.text())

// Istanza del manager DIDComm
const didcommManager = new DIDCommManager()

// Endpoint per ricevere messaggi DIDComm
app.post('/messaging', async (req, res) => {
  console.log('\n Nuovo messaggio DIDComm ricevuto')
  
  try {
    // Il messaggio può arrivare come stringa o oggetto JSON
    const packedMessage = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body)
    
    // TBD: Processa il messaggio ricevuto
    
    res.status(200).json({ 
      status: 'success',
      message: 'Messaggio ricevuto e processato' 
    })
    
  } catch (error) {
    console.error('Errore nel processare il messaggio:', error)
    res.status(400).json({ 
      status: 'error',
      message: 'Errore nel processare il messaggio',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

//Endpoint per ottenere il DID dell'agente
app.get('/did', async (req, res) => {
  try {
    const did = didcommManager.getDID()
    
    if (!did) {
      return res.status(404).json({ 
        status: 'error',
        message: 'DID non ancora inizializzato' 
      })
    }
    
    res.json({ 
      did,
      serviceEndpoint: `http://localhost:${PORT}/messaging`
    })
    
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Errore nel recuperare il DID' 
    })
  }
})

// Endpoint per inviare un messaggio a un altro agente
app.post('/send-message', async (req, res) => {
  try {
    const { recipientDID, messageType, body } = req.body
    
    if (!recipientDID || !messageType || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'Parametri mancanti: recipientDID, messageType, body sono richiesti'
      })
    }
    
    const result = await didcommManager.sendMessage(
      recipientDID,
      messageType,
      body
    )
    
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

// Endpoint di health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'DIDComm Server',
    port: PORT
  })
})

// Avvio il server e inizializza l'agente
async function startServer() {
  try {
    // Inizializzo il manager DIDComm
    console.log(' Inizializzazione DIDComm Manager...')
    await didcommManager.initialize('default')
    
    // Avvio il server Express
    app.listen(PORT, () => {
      console.log(`\n Server DIDComm avviato su http://localhost:${PORT}`)
      console.log(`Endpoint messaggi: http://localhost:${PORT}/messaging`)
      console.log(`DID dell'agente: ${didcommManager.getDID()}`)
      console.log('\nEndpoints disponibili:')
      console.log('  POST /messaging     - Ricevi messaggi DIDComm')
      console.log('  POST /send-message  - Invia un messaggio')
      console.log('  GET  /did          - Ottieni il DID dell\'agente')
      console.log('  GET  /messages     - Lista messaggi salvati')
      console.log('  GET  /health       - Health check')
      console.log('\n' + '='.repeat(50))
    })
    
  } catch (error) {
    console.error('Errore nell\'avvio del server:', error)
    process.exit(1)
  }
}

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Arresto del server...')
  process.exit(0)
})

// Avvio il server
startServer()