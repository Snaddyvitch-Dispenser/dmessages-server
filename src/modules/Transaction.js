import UserManager from "./UserManager.js";
import TransactionVerifier from "./TransactionVerifier.js";
import getCurrentEpoch from "./getCurrentEpoch.js";

class OperationLogIn {
    constructor(data, generatedData) {
        this.type = "login";
        this.username = generatedData.username;
        this.requiredSignatures = generatedData.requiredSignatures;
        this.expectedNonce = generatedData.expectedNonce;
        this.data = data;
    }

    static async getTransaction(data, dbPool, client) {
        let userManager = UserManager.getManager(dbPool, client);
        let requiredSignatures = [];
        let expectedNonce = 0;
        if (data.username) {
            let user = await userManager.getUserByName(data.username);
            if (user !== false) {
                requiredSignatures.push(data.username)
                expectedNonce = [user.getNextNonce(), user.name];
            } else {
                return false;
            }
        } else {
            return false;
        }

        return new OperationLogIn(data, {username: data.username, requiredSignatures, expectedNonce});
    }
}

class OperationUnknown {
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }

    static getOperation(type, data) {
        return new OperationUnknown(type, data);
    }
}

// MUST BE AFTER OPERATIONS OR ELSE JS GETS PISSED
const OPERATION_MAPPINGS = {"login": OperationLogIn};

class Transaction {
    constructor(operations, transaction, signatures, id, dbPool, client) {
        this.operations = operations;
        this.transaction = transaction;
        this.signatures = signatures;
        this.id = id;
        this.dbPool = dbPool;
        this.client = client;
    }

    static async fromWebsocket(wrappedTransaction, receivedAt = 0, dbPool, client) {
        let transactionVerifier = TransactionVerifier.getVerifier(dbPool, client);

        let id, transaction;

        try {
            let jsonWrappedTransaction = JSON.parse(wrappedTransaction);
            if (!jsonWrappedTransaction.hasOwnProperty("id") || !jsonWrappedTransaction.hasOwnProperty("data")) return [false, "@NOT_A_WRAPPED_TRANSACTION"]
            id = jsonWrappedTransaction["id"];
            transaction = jsonWrappedTransaction["data"];

        } catch (e) {
            return [false, "@TRANSACTION_ERROR_BAD_JSON"]
        }

        if (receivedAt === 0) receivedAt = getCurrentEpoch();

        try {
            // noinspection JSUnresolvedVariable
            if (transaction.send_time > getCurrentEpoch() - (transaction.expires_in || 1200) || transaction.expires_in === 0) {
                // noinspection JSUnresolvedVariable
                console.error("🛑 Transaction Took More than " + (transaction.expires_in || 1200) + " Seconds To Be Received By Server. Rejected.");
                return [false, "@RECEIVED_TOO_LATE"];
            } else {
                // noinspection JSUnresolvedVariable
                if (transaction.send_time > getCurrentEpoch() - 120) {
                    console.warn("⚠ Transaction Took More than 120 Seconds To Be Received By Server.");
                }
            }
            let signatures = transaction.signatures;
            delete transaction.signatures;
            let signedObject = JSON.stringify(transaction);
            // add received time so client can decide whether they want to accept it.
            transaction.signatures = signatures;
            transaction.receive_time = receivedAt;
            let operations = [];
            let op_types = [];
            let [channels_involved, users_involved] = [[],[]];
            for (let t = 0; t < transaction.operations.length; t++) {
                let op_name = transaction.operations[t][0].toLowerCase();
                let op_content = transaction.operations[t][1];
                op_types.push(op_name);
                // TODO: Messaging ops should add to channels_involved, users_involved
                if (OPERATION_MAPPINGS.hasOwnProperty(op_name)) {
                    operations.push(OPERATION_MAPPINGS[op_name].getOperation(op_content, dbPool, client));
                } else {
                    operations.push(OperationUnknown.getOperation(op_name, op_content));
                }
            }

            let requiredSignatures = [];
            let highNonce = [0, ""];
            for (let i = 0; i < operations.length; i++) {
                // Not false or unknown
                if (operations[i] !== false && !(operations[i] instanceof OperationUnknown)) {
                    requiredSignatures = [...requiredSignatures, ...operations[i].requiredSignatures];
                    if (operations[i].expectedNonce[0] > highNonce[0]) {
                        highNonce = operations[i].expectedNonce;
                    }
                }
            }

            if (highNonce[1] === "") { // no user found
                return [false, "@TRANSACTION_NONCE_USER_NONE"];
            }

            let signedBy = {};
            for (let r = 0; r < requiredSignatures.length; r++) {
                signedBy[requiredSignatures[r]] = false;
            }

            let success = true;
            let error_last = "";
            for (let name in signedBy) {
                let isSignedCorrectly = transactionVerifier.isSignedBy(signatures, signedObject, name);
                if (!isSignedCorrectly[0]) {
                    success = false;
                    error_last = isSignedCorrectly[0];
                }
            }

            if (!success) {
                return [false, error_last];
            }

            if (Object.keys(signedBy).length === 0) {
                return [false, "@TRANSACTION_NO_SIGNERS"];
            }


            // op_types = ["login"]
            // op_involves = {"channels": ["139229572895625"], "users": ["cadawg"]};
            // No database commit if it includes a login (and only a login).
            if (!(op_types.length === 1 && op_types.includes("login"))) {
                let result = await dbPool.query("INSERT INTO `transactions` SET ?", {transaction, user_for_nonce: highNonce[1], nonce: highNonce[0], op_types: JSON.stringify(op_types), op_involves: JSON.stringify({channels: channels_involved, users: users_involved})});
                if (result[0].affectedRows !== 1) {
                    return [false, "@TRANSACTION_DATABASE_ERROR"];
                }
            }

            // need TODO Something with the new transactions we got (process them)
            // TODO Shouldn't be saved outside of here because we filter out certain ops (login .etc. that have no use other than for tracking)
            return [true, new Transaction(operations, transaction, signatures, id, dbPool, client)];
        } catch (e) {
            return [false, "@TRANSACTION_ERROR"]
        }
    }
}

export default Transaction;
export {OperationLogIn};