import { verifyVC } from "../src/verifierService.js";  
import { createVC } from "../src/issuerService.js";
import { createDID } from "../src/holderService.js";

async function testV1() {
   await createDID();
   await createVC();
   await verifyVC();
}

testV1()
