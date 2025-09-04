import { verifyVC } from '../src/triangle/verifierService.js'
import { createDID } from '../src/triangle/holderService.js'
import { createVC } from '../src/triangle/issuerService.js'

const aliasServer = 'default'
const aliasSender = 'test-sender9'

async function testV1() {
   const identifier = await createDID(aliasServer);
   console.log("Created DID:", identifier.did);
   await createVC();
   await verifyVC();
}
testV1()