class BaseManager {
    client;
    dbPool;

    constructor(dbPool, client) {
        this.dbPool = dbPool;
        this.client = client;
    }

    static getManager(dbPool, client) {
        return new this(dbPool, client);
    }
}

export default BaseManager;