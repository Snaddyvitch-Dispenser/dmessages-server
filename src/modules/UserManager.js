import User from './User';
import BaseManager from "./BaseManager";

class UserManager extends BaseManager {
    async getUserByName(name) {
        return User.fromName(name, this.dbPool, this.client);
    }
}

export default UserManager;