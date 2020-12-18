import User from './User.js';
import BaseManager from "./BaseManager.js";

class UserManager extends BaseManager {
    async getUserByName(name) {
        return User.fromName(name, this.dbPool, this.client);
    }
}

export default UserManager;