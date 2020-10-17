class User {
    json;
    dbPool;
    client;
    name;
    id;

    constructor(json, dbPool, client) {
        this.json = json;
        this.name = json.name;
        this.id = json.id;
        this.dbPool = dbPool;
        this.client = client;
    }

    toString() {
        return "User " + this.json.name + " (id " + this.json.id + ")";
    }

    // TODO: This shouldn't be needed if we're streaming updates live from the chain.
    async updateFromHive() {
        let accountData = await this.client.database.getAccounts([this.json.name]);
        if (accountData[0] && accountData[0].name === this.json.name) {
            try {
                await this.dbPool.query("UPDATE `users` SET ? WHERE name = ?", [{json: JSON.stringify(accountData[0]), id: accountData[0].id, name: accountData[0].name}, accountData[0].name]);

                let [users] = await this.dbPool.query("SELECT * FROM `users` WHERE name=?", [this.json.name]);
                if (users.length === 1) {
                    this.json = accountData[0];
                    return true;
                }
            } catch (e) {
                return false;
            }
        }

        return false;
    }

    async getNextNonce() {
        // TODO: Add to database properly
        try {
            let [data] = await this.dbPool.query("SELECT COALESCE(MAX(nonce),-1)+1 as nonce FROM `transactions` WHERE user_for_nonce=?", [this.json.name]);
            return data[0]["nonce"];
        } catch (e) {
            return false;
        }
    }

    getAuthorityKeys(authority = "posting") {
        authority = authority.toLowerCase();
        if (authority === "memo") {
            return [this.json.memo_key];
        } else {
            return this.json[authority].key_auths;
        }
    }

    getKeyThreshold(authority = "posting") {
        authority = authority.toLowerCase();
        return this.json[authority].weight_threshold;
    }

    static async fromName(name, dbPool, client) {
        name = name.toLowerCase();

        try {
            let [users] = await dbPool.query("SELECT * FROM `users` WHERE name=?", [name]);
            if (users.length === 1) {
                return new User(JSON.parse(users[0].json), dbPool, client);
            } else {
                let accountData = await client.database.getAccounts([name]);
                if (accountData[0] && accountData[0].name === name) {
                    await dbPool.query("INSERT INTO `users` SET ?", {json: JSON.stringify(accountData[0]), id: accountData[0].id, name: accountData[0].name});

                    let [users] = await dbPool.query("SELECT * FROM `users` WHERE name=?", [name]);
                    if (users.length === 1) {
                        return new User(JSON.parse(users[0].json), dbPool, client);
                    }
                }
            }
        } catch (e) {
            return false;
        }

        return false;
    }
}

export default User;