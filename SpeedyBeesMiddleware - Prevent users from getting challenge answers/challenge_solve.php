<?php
/**
 * Created by PhpStorm.
 * User: Conor Howland
 * Date: 21/04/2020
 * Time: 21:13
 */

// Import session & cors logic - Bonus - $config is now available in this document
require "sessions.php";

if (isset($_POST["user"]) and isset($_POST["answer"])) {
    if (!isset($_SESSION["username"]) or $_SESSION["username"] != $_POST["user"]) {
        if (isset($_SESSION["challenge_answer"]) and isset($_SESSION["challenge_question"]) and isset($_SESSION["challenge_user"]) and strtolower($_SESSION["challenge_user"]) == strtolower($_POST["user"])) {
            $matches = [];
            if (preg_match("/#I, ([a-z0-9\.\-]{3,16}), a user of the hive blockchain wish to sign in to the '([a-zA-Z0-9 ]{1,32})' application made by '([a-z0-9\.\-]{3,16})'. Please log me into this session with the random value of ([a-f0-9]{100})/", $_POST["answer"], $matches)) {
                if ($matches[0] == $_POST["answer"]) {
                    if (strtolower($matches[1]) == strtolower($_SESSION["challenge_user"]) and $matches[2] == $config->app->name and $matches[3] == $config->app->author) {
                        $username = $_SESSION["challenge_user"];
                        session_unset();
                        $_SESSION["username"] = $username;
                        json_return([
                            "success" => true,
                            "user" => strtolower($username)
                        ]);
                    } else {
                        json_return([
                            "success" => false,
                            "error_message" => "This login was made for a different app or user. Please try again."
                        ]);
                    }
                } else {
                    json_return([
                        "success" => false,
                        "error_message" => "This login is not in the correct format. Please try again."
                    ]);
                }
            } else {
                json_return([
                    "success" => false,
                    "error_message" => "Failed to check your login. Please try again."
                ]);
            }

        } else {
            json_return([
                "success" => false,
                "error_message" => "Challenge not known. Please try enabling third-party cookies and then try again."
            ]);
        }
    } else {
        json_return([
            "success" => false,
            "error_message" => "You're already signed in. Please reload the page.",
            "user" => $_SESSION["username"]
        ]);
    }
} else {
    json_return([
        "success" => false,
        "error_message" => "You haven't sent us the answer, therefore we can't log you in. Please try again."
    ]);
}
