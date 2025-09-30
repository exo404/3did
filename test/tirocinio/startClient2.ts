import { startClient } from "../src/didcomm/tirocinio/didcommClient.js";

startClient(process.env.CLIENT_2_ALIAS, Number(process.env.CLIENT_2_PORT));