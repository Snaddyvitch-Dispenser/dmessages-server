<?php
// Config File for App Defaults
return (object)[
    "app" => (object)[
        "name" => "dMessages",
        "author" => "cadawg",
        "domain" => "dmessages.app"
    ],
    "cookies" => (object)[
        "domain" => ".dmessages.app",
        "path" => "/",
        "session" => (object) [
            "name" => "APISESSION",
            "expiry" => time() + 604800,
            "secure" => true,
        ],
    ]
];