class OperationResponses {
    constructor(dbPool, client) {
        this.dbPool = dbPool;
        this.client = client;
    }

    static getResponder(dbPool, client) {
        return new OperationResponses(dbPool, client);
    }

    loginResponse(operation, ws) {
        let responseTransaction = [];

        // Add Login Approve (Login) Transaction - Will Log Client In
        responseTransaction.push({"type": "login", "data": {"success": true, "name": operation.username}});
        ws.subscribe("user:" + operation.username);

        return responseTransaction;

        // TODO: Save and load user preferences - On the client?
    }

    messageResponse(operation) {
        
    }
}

export default OperationResponses;