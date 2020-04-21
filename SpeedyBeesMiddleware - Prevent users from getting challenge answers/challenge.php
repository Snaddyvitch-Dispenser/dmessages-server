<?php
$currentCookieParams = session_get_cookie_params();

$rootDomain = '.dmessages.app';
$expiresAt = time() + 604800;
$secureCookie = true;

session_set_cookie_params(
    $expiresAt,
    "/",
    $rootDomain,
    $secureCookie
);

session_name('APISESSION');
session_start();

setcookie('APISESSION', session_id(), $expiresAt, '/', $rootDomain);

// Fix CORS
if (isset($_SERVER['HTTP_ORIGIN'])) {
    // Decide if the origin in $_SERVER['HTTP_ORIGIN'] is one
    // you want to allow, and if so:
    $host_names = explode(".", $_SERVER["HTTP_ORIGIN"]);
    if ($host_names[count($host_names)-2] . "." . $host_names[count($host_names)-1] == "dmessages.app") {
        header("Access-Control-Allow-Origin: $_SERVER[HTTP_ORIGIN]");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 0');    // cache for 1 day
    }
}

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
