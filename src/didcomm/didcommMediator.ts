import express, { raw } from 'express'
import { agent, DIDCommV2MediatorMessageType } from '../veramoAgent.js'
import { DIDCommManager } from './DIDCommManager.js'

const app = express()
const PORT = process.env.MEDIATOR_PORT

// Middleware per parsing JSON e DIDComm
app.use(express.json())
app.use(express.text({ type: 'application/didcomm-encrypted+json' }))

app.post('/didcomm', async (req, res) => {
  console.log('\n Nuovo messaggio DIDComm ricevuto')
  
  try {
    const rawMessage = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body)

    const processedMessage = await agent.handleMessage({ 
      raw: rawMessage,
      save: true 
    })

    console.log(` Messaggio processato: ${processedMessage.type}`)
    
    res.status(200).json({
      status: 'success', 
      message: 'Messaggio processato'
    })
    
  } catch (error) {
    console.error(' Errore nel processare il messaggio:', error)
    res.status(400).json({ 
      status: 'error',
      message: 'Errore nel processare il messaggio',
      error: error instanceof Error ? error.message : 'Unknown error'
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
      console.log(`\n DID del mediatore: ${didcommManager.getDID()}`)
      console.log('\n Endpoints disponibili:')
      console.log('  POST /didcomm              - Ricevi messaggi DIDComm')
      console.log('='.repeat(60))
    })
    
  } catch (error) {
    console.error(' Errore nell\'avvio del mediatore:', error)
    process.exit(1)
  }
}