import { agentMediator} from "../veramoAgentMediator.js";
import express from 'express'
import bodyParser from 'body-parser'
import {asArray} from '@veramo/utils'
import cors from 'cors'

const app = express()
app.use('/didcomm', bodyParser.text({
  type: [
    'application/didcomm-encrypted+json',
    'application/didcomm-signed+json',
    'application/didcomm-plain+json',
    'application/didcomm-enveloped+json',
    'application/json' 
  ]
}))

//app.use(cors())

app.post('/didcomm', async (req, res) => {
  try {
    const handled = await agentMediator.handleMessage({
      raw: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      save: true,
    })
    const rr = handled?.metaData?.find?.(m => m?.type === 'ReturnRouteResponse')
    if (rr?.value) {
      const { message, contentType } = JSON.parse(rr.value)
      res.status(200).type(contentType).send(message)
      return
    }
    // Se non c'è ReturnRouteResponse è un basic message senza risposta
    else {
      await agentMediator.dataStoreSaveMessage({
        message: {
          type: handled.type,
          from: handled.from,
          to: asArray(handled.to)[0],
          id: handled.id,
          data: handled.data,
          createdAt: handled.createdAt
        },
      })
      res.status(200).send('Messaggio DIDComm gestito senza ReturnRouteResponse')
      return
    }
  } catch (e) {
    console.error(e)
    return res.send(e.message)
  }
})

export async function startMediator(port: number) {
  try {
    app.listen(port, () => {
      console.log(`\nServer DIDComm avviato su http://localhost:${port}`)
      console.log('\nEndpoints disponibili:')
      console.log('  POST /didcomm   - Invia un messaggio DIDComm')
      console.log('\n' + '='.repeat(50))
    })
    
  } catch (error) {
    console.error('Errore nell\'avvio del server:', error)
    process.exit(1)
  }
}

startMediator(3000)