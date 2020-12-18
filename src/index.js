import uWebSockets from 'uWebSockets.js';
const webSocketsServerPort = 9980;
import ChannelManager from "./modules/ChannelManager.js";
import {Client} from "@hiveio/dhive";
import mysql from "mysql2";
import MessageLoader from "./messages/MessageLoader.js";
import UserManager from "./modules/UserManager.js";
import TransactionManager from "./modules/TransactionManager.js";
import getCurrentEpoch from "./modules/getCurrentEpoch.js";
import HandleOperations from "./modules/HandleOperations.js";
import OperationResponses from "./modules/OperationResponses.js";
import wrappedError from "./modules/wrappedError.js";
import JSONGetID from "./modules/JSONGetID.js";

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
    message: async (ws, message, isBinary) => {
        // Get JS Message Text
        let messageText = Buffer.from(message).toString();
        // Current Time
        let receivedAt = getCurrentEpoch();

        // Load Transaction From Websocket
        let transaction = await transactionManager.fromWebsocket(messageText, receivedAt);

        // {id: 1, data: {transactions here}}
        let response;
        // Transaction 0 contains true/false
        if (!transaction[0]) {
            // Transaction 1 = Error Message
            response = wrappedError(transaction[1], JSONGetID(messageText));
        } else {
            // Handle all the different operations.
            // Transaction [1] is a Transaction() Object in this case.
            response = HandleOperations(transaction[1], operationResponses, ws);
        }

        // Send message back
        ws.send(response, isBinary, true);
    }

}).listen(webSocketsServerPort, (listenSocket) => {
    if (listenSocket) {
        console.log('Listening to port ' + webSocketsServerPort);
    } else {
        console.error('Failed to start server!');
    }
});