import {OperationLogIn} from "./Transaction";

function HandleOperations (transaction, operationResponses) {
    let responseTransaction = [];

    for (let o = 0; o < transaction.operations.length; o++) {
        let op = transaction.operations[o];
        if (op instanceof OperationLogIn) {
            responseTransaction = [...responseTransaction, ...operationResponses.loginResponse(op)];
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