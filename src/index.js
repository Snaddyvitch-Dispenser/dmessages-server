import uWebSockets from 'uWebSockets.js';
const webSocketsServerPort = 9980;
import ChannelManager from "./modules/ChannelManager";
import {Client} from "@hiveio/dhive";
import mysql from "mysql2";
import MessageLoader from "./messages/MessageLoader";
import UserManager from "./modules/UserManager";
import TransactionManager from "./modules/TransactionManager";
import getCurrentEpoch from "./modules/getCurrentEpoch";
import {OperationLogIn} from "./modules/Transaction";
import HandleOperations from "./modules/HandleOperations";
import OperationResponses from "./modules/OperationResponses";
import wrappedError from "./modules/wrappedError";

// Connection to the hive network (for verifying signatures to keys)
const hiveClient = new Client(["https://api.deathwing.me", "https://api.hive.blog", "https://api.hivekings.com", "https://anyx.io", "https://api.openhive.network"]);

// database pool
const dbPoolSync = mysql.createPool({
    connectionLimit: 100,
    host: "localhost",
    user: "root",
    password: "",
    database: "dmessages",
    charset: "utf8mb4"
});

const dbPool = dbPoolSync.promise();

const channelManager = ChannelManager.getManager(dbPool, hiveClient);
const userManager = UserManager.getManager(dbPool, hiveClient);
const transactionManager = TransactionManager.getManager(dbPool, hiveClient);
const operationResponses = OperationResponses.getResponder(dbPool, hiveClient);

//userManager.getUserByName("cadawg").then(r => console.log(r.getAuthorityKeys("active"), r.getAuthorityKeys("posting"), r.getAuthorityKeys("owner"), r.getAuthorityKeys("memo")));

//channelManager.getById(393536498156568576).then(r => console.log(r))

/*channelManager.create("CA's Kingdom", "cadawg", "STM5U4gP8VJuc42pXRSfESWtyKL8UbkatcE29HHdmDoMECzUUr2yE")
    .then(function (result) {
        console.log("they tryna be lamp", result);
    });*/

//channelManager.getChannelById(393536498156568576).then(r => console.log("lol", r.owner.name, r.owner.id));
//channelManager.getChannelById(393536498156568576).then(async channel => console.log(await channel.owner.getNextNonce()));

/*transactionManager.isSignedBy(["1f19fa327860677010e288511b14a16f138cad37f3185227acab1a759072753e9f1de0403ec59a7bba6520642fd1899f4f28dbd5820b4c27caded54f0d8def83a2"],
    "{\"nonce\":1,\"operations\":[[\"upload_invite\",{\"channel\":\"314253290850782635832576\",\"link_hash\":\"\",\"extensions\":[]}]],\"extensions\":[]}",
    "cadawg").then(r => console.log(r));*/

// format:
// ws.subscribe (system) - system // messages (user:username) // channel(channel:xyz32w90urj)


uWebSockets.App().ws('/*', {
    open: (ws) => {
        ws.subscribe("system");
    },

    // For brevity we skip the other events (upgrade, open, ping, pong, close)
    message: async (ws, message, isBinary) => {
        let messageText = Buffer.from(message).toString();
        let receivedAt = getCurrentEpoch();

        let transaction = await transactionManager.fromWebsocket(messageText, receivedAt);

        // todo: wrap in {"id": 0, transaction: {...}} so that we can respond to items properly.

        let response = [];
        if (!transaction[0]) {
            // todo: finish wrapped error
            response = wrappedError(transaction[1]);
        } else {
            // Handle all the different operations.
            response = HandleOperations(transaction[1], operationResponses);
        }

        return response;
    }

}).listen(webSocketsServerPort, (listenSocket) => {
    if (listenSocket) {
        console.log('Listening to port ' + webSocketsServerPort);
    } else {
        console.error('Failed to start server!');
    }
});