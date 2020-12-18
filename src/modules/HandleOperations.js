import {OperationLogIn} from "./Transaction.js";

function HandleOperations (transaction, operationResponses, ws) {
    let responseTransaction = [];

    for (let o = 0; o < transaction.operations.length; o++) {
        let op = transaction.operations[o];
        if (op instanceof OperationLogIn) {
            responseTransaction = [...responseTransaction, ...operationResponses.loginResponse(op, ws)];
        }
    }
}

/*
Server Response:
[
    {"type": "login", "data": {"success": "true", "name": "cadawg"}},
    {"type": "clientPreferences", "data": { ... }}
]

* */

export default HandleOperations;