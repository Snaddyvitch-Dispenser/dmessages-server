import BaseManager from "./BaseManager.js";
import UserManager from "./UserManager.js";
import { PublicKey, Signature, cryptoUtils } from "@hiveio/dhive";
import Transaction from "./Transaction.js";

class TransactionManager extends BaseManager {
    constructor(dbPool, client) {
        super(dbPool, client);
        this.userManager = UserManager.getManager(dbPool, client);
    }

    async fromWebsocket(transaction, received_at) {
        return await Transaction.fromWebsocket(transaction, received_at, this.dbPool, this.client);
    }
}

export default TransactionManager;

/*
{
  "nonce": 1, // always incrementing number, unique per-user.
  "send_time": 23895298579825,
  "expires_in": 1200,
  "operations": [
    [
      "upload_invite",
      {
        "channel": "314253290850782635832576", // JSON Fucking Hates BigIntegers so use strings instead
        "link_hash": "",
		"extensions": []
      }
    ]
  ],
  "extensions": [],
  "signatures": [
    "2029e8ed5778077632c3cb841b1e16f8f5b477d8ca8369677c45ecd95fa495b29656b57072fe0e15415d78a17446652081b56700f16b132b770f9ad7d1f34ac34b"
  ]
}

signature = take out [signatures] and sign the transaction.

signatures required:
channel operations:
channel key & user key
*/