import { startClient } from "../src/didcomm/tirocinio/didcommClient.js";

startClient(process.env.CLIENT_1_ALIAS, Number(process.env.CLIENT_1_PORT));
