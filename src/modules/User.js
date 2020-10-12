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

    async updateFromHive() {
        let accountData = await this.client.database.getAccounts([this.json.name]);
        if (accountData[0] && accountData[0].name === this.json.name) {
            await this.dbPool.query("UPDATE `users` SET ? WHERE name = ?", [{json: JSON.stringify(accountData[0]), id: accountData[0].id, name: accountData[0].name}, accountData[0].name]);

            let [users] = await this.dbPool.query("SELECT * FROM `users` WHERE name=?", [this.json.name]);
            if (users.length === 1) {
                this.json = accountData[0];
                return true;
            }
        }

        return false;
    }

    getAuthorityKeys(authority = "posting") {
        if (authority === "memo") {
            return [this.json.memo_key];
        } else {
            let threshold = this.json[authority].weight_threshold;
            let keys = [];
            for (let auth in this.json[authority].key_auths) {
                if (this.json[authority].key_auths.hasOwnProperty(auth)) {
                    let key_data = this.json[authority].key_auths[auth];
                    if (key_data[1] >= threshold) {
                        keys.push(key_data[0]); // add valid key
                    }
                }
            }

            return keys;
        }
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