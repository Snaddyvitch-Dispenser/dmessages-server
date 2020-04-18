const express = require('express');
const hive = require('@hivechain/hivejs');
const crypto = require('crypto');

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json({strict: false}))

app.post("/get_message", (req, res) => {
  var data = req.body;

  // If user's name is set
  if ('name' in data) {
    // Get account from hive network (to get their keys for login)
    hive.api.getAccounts([data.name], function(err, result) {
      // If account is found
      if (0 in result) {
        if (result[0].memo_key.length == 53) {
          // Generate a challenge for the user, which requires them to decrypt with their memo key to prove ownership of their account
          var login_proof = "#I, " + data.name + ", a user of the hive blockchain wish to sign in to the 'hive chat' application made by cadawg. Please log me into this session with the random value of " + crypto.randomBytes(20).toString('hex');
          var encrypted_proof = hive.memo.encode("5HvKXFUp6USSLMAy7pPcJ83qZLk83hBE1WvKnR5TE4YJKtPw4rQ", result[0].memo_key, login_proof);

          res.json({"success": true, "data": {"user": data.name, "challenge": encrypted_proof, "answer": login_proof}});
        } else {
          // Respond for invalid keys
          res.json({"success": false, "error_message": "This user doesn't have a valid memo key"});
        }
      } else {
        res.json({"success": false, "error_message": "Account doesn't exist, or hive network is unavailable."})
      }
    });
  } else {
    return;
  }
});

app.use(function (error, req, res, next) {
  return res.json({"success": false, "error_message": "The method you requested is currently unavailable."});
});

app.listen(3000, () => {
  console.log('server started');
});