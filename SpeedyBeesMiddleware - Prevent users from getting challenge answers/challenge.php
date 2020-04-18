<?php

// Start a session cookie to store in the browser info about current status
session_start();
if (isset($_GET["user"])) {
    if (isset($_SESSION["challenge_answer"]) and isset($_SESSION["challenge_question"]) and isset($_SESSION["challenge_user"]) and $_SESSION["challenge_user"] == $_GET["user"]) {
        header("Content-Type: application/json");
        $data = [
            "success" => true,
            "data" => [
                "challenge" => $_SESSION["challenge_question"],
                "user" => $_SESSION["challenge_user"]
            ]
        ];
        echo(json_encode($data));
    } else {
        // Open a connection and get a challenge and answer for the current user
        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://api.steem.tools/get_message",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => "name=" . $_GET["user"],
            CURLOPT_HTTPHEADER => array(
                "Cache-Control: no-cache",
                "Content-Type: application/x-www-form-urlencoded"
            ),
        ));

        // Get any responses and errors
        $response = curl_exec($curl);
        $err = curl_error($curl);

        // Close connection
        curl_close($curl);

        // Check for web server errors
        if ($err) {
            header("Content-Type: application/json");
            print('{"success": false, "error_message": "Error signing challenge, please try again later!"}');
            die();
        } else {
            // Decode JSON
            $json = json_decode($response);
            // If it succeeded
            if ($json->success) {
                // Save in the session, in case the same user requests another challenge before logging in (prevents "invalid challenge" if open in multiple tabs)
                $_SESSION["challenge_answer"] = $json->data->answer;
                $_SESSION["challenge_question"] = $json->data->challenge;
                $_SESSION["challenge_user"] = $json->data->user;
                // Repeat only the challenge back to the user, for them to solve and answer
                header("Content-Type: application/json");
                $data = [
                    "success" => true,
                    "data" => [
                        "challenge" => $_SESSION["challenge_question"],
                        "user" => $_SESSION["challenge_user"]
                    ]
                ];
                echo(json_encode($data));
            } else {
                // Otherwise report an error and pass through the error.
                header("Content-Type: application/json");
                print('{"success": false, "error_message": "' . $json->error_message . '"}');
            }
        }
    }
} else {
    // No user specified
    header("Content-Type: application/json");
    print('{"success": false, "error_message": "You haven\'t specified a user to login as."}');
}