<?php
/**
 * Created by PhpStorm.
 * User: Conor Howland
 * Date: 21/04/2020
 * Time: 22:43
 */

$config = require "config.php";

// Session Setup

// Set Parameters from config file
session_set_cookie_params(
    $config->cookies->session->expiry,
    $config->cookies->path,
    $config->cookies->domain,
    $config->cookies->session->secure
);

// Set session name and start session
session_name($config->cookies->session->name);
session_start();

// Set session cookie with correct timings
setcookie($config->cookies->session->name, session_id(), [
    'expires' => $config->cookies->session->expiry,
    'path' => $config->cookies->path,
    'domain' => $config->cookies->domain,
    'secure' => true,
    'httponly' => true,
    'samesite' => 'None',
]);

// Due to the fact that we are using multiple sub-domains, we must enable Cross-Origin-Resource-Sharing (CORS) for our entire domain.
if (isset($_SERVER['HTTP_ORIGIN'])) {
    // Split Host Name into portions
    $host_names = explode(".", $_SERVER["HTTP_ORIGIN"]);
    if (sizeof($host_names) > 1) {
        $host_domain = $host_names[count($host_names)-2] . "." . $host_names[count($host_names)-1];
    } else {
        $host_domain = $_SERVER["HTTP_ORIGIN"];
    }

    // Get domain and check if it's ours
    if ($host_domain === $config->app->domain or $host_domain === "http://localhost:3000") {
        // Set CORS headers so browsers can access this page.
        header("Access-Control-Allow-Origin: $_SERVER[HTTP_ORIGIN]");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 0');    // cache for 1 day
        header('Access-Control-Allow-Methods: GET,PUT,POST,DELETE,PATCH,OPTIONS'); // Allow all kinds of requests
        header("Access-Control-Allow-Headers: Origin,X-Requested-With,Content-Type,Accept,Authorisation");
    }
}

// API Return Values
function json_return($array = []) {
    header("Content-Type: application/json");
    print(json_encode($array));
}
