import { agentMediator} from "./veramoAgentMediator.js";
import express from 'express'

const app = express()
app.use(express.json())


app.post('/didcomm', async (req, res) => {
  console.log('\n Messaggio DIDComm ricevuto')
  try {
    const message  = req.body
    const didcommMessage = await agentMediator.handleMessage(message)
    agentMediator.dataStoreSaveMessage({
        message: didcommMessage,
    })
    console.log('Messaggio DIDComm elaborato:', didcommMessage)
    res.status(200).json({ 
      status: 'success',
      result: didcommMessage,
      message: 'Messaggio DIDComm elaborato con successo',
    })
  } catch (error) {
    console.error('', error)
    res.status(400).json({ 
      status: 'error',
      message: 'Errore nell\'elaborazione del messaggio DIDComm',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Avvio il server e inizializza l'agente
export async function startMediator(port: number) {
  try {
    // Avvio il server Express
    app.listen(port, () => {
      console.log(`\nServer DIDComm avviato su http://localhost:${port}`)
      console.log('\nEndpoints disponibili:')
      console.log('  POST /didcomm   - Invia un messaggio DIDComm')
      console.log('  GET  /messages   - Ricevi messaggi DIDComm in coda')
      console.log('\n' + '='.repeat(50))
    })
    
  } catch (error) {
    console.error('Errore nell\'avvio del server:', error)
    process.exit(1)
  }
}

startMediator(3000)
