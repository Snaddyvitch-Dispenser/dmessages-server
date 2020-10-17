import {cryptoUtils, PublicKey, Signature} from "@hiveio/dhive";
import UserManager from "./UserManager";

class TransactionVerifier {
    constructor(dbPool, client) {
        this.dbPool = dbPool;
        this.client = client;
        this.userManager = UserManager.getManager(dbPool, client);
    }

    static getVerifier(dbPool, client) {
        return new TransactionVerifier(dbPool, client);
    }

    /**
     * @description Verify Signatures by providing a key/keys & thresholds/user's name. Supports multi-signature.
     * @param {Array} signatures
     * @param {string} message
     * @param {(Array | String)} expected_signer
     * @param {string} type
     * @param {number} threshold
     * @param {number} time
     * @returns {(Array | boolean)}
     */
    async isSignedBy(signatures, message, expected_signer, type = "active", threshold = -1, time = -1) {
        // Get Keys That can sign this for it to be valid
        let keysThatCanSign = [];
        try {
            // If it's a string, try and parse as a key, if not, it's a user probably
            if (typeof expected_signer === "string" || expected_signer instanceof String) {
                let thePk = PublicKey.fromString(expected_signer);
                keysThatCanSign.push([thePk.toString(), 1]);
            } else {
                // not a string, so can't be a username - no need to throw
                for (let k = 0; k < expected_signer.length; k++) {
                    try {
                        let thePk = PublicKey.fromString(expected_signer[k][0]);
                        keysThatCanSign.push(thePk.toString(), expected_signer[k][1])
                    } catch (e) {} // Don't do anything, just continue
                }
            }
        } catch (e) {
            let user = await this.userManager.getUserByName(expected_signer);
            if (user !== false) {
                if (threshold === -1) threshold = user.getKeyThreshold(type);
                keysThatCanSign = user.getAuthorityKeys(type);
            } else {
                return [false, "@SIGNATURE_USER_KEY_NOT_EXIST"];
            }
        }

        // Make sure threshold is positive or else.
        if (threshold === -1) threshold = 1;


        let signerKeys = [];
        try {
            for (let s = 0; s < signatures.length; s++) {
                signerKeys.push(Signature.fromString(signatures[s]).recover(cryptoUtils.sha256(message)).toString());
            }
        } catch (e) {
            return [false, "@SIGNATURE_NOT_DECODE"];
        }

        let keys_sign_weight = 0;
        let spent_keys = [];
        for (let k = 0; k < signerKeys.length; k++) {
            for (let ik = 0; ik < keysThatCanSign.length; ik++) {
                // Same key can't sign more than once
                if (!spent_keys.includes(keysThatCanSign[ik][0])) {
                    if (keysThatCanSign[ik][0].toString() === signerKeys[k].toString()) {
                        keys_sign_weight += keysThatCanSign[ik][1];
                        spent_keys.push(keysThatCanSign[ik][0]);
                    }
                }
            }
        }

        // If keys meet threshold, return True
        if (keys_sign_weight >= threshold) {
            return [true];
        } else {
            return [false, "@SIGNATURE_KEYS_NOT_MEET_THRESHOLD"];
        }

        // TODO: implement time once we have history
    }
}

export default TransactionVerifier;