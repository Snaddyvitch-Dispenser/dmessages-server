import BaseManager from "./BaseManager";

class TransactionManager extends BaseManager {
    async isSignedBy(signatures, key, user) {
        // TODO: Historic Key Caching
        // IDK Maybe this should be part of a TransactionManager
    }
}

/*
{
  "nonce": 1, // always incrementing number, unique per-user.
  "operations": [
    [
      "upload_invite",
      {
        "channel": 314253290850782635832576,
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