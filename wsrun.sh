#!/bin/bash

deno run -c tsconfig.json --allow-net --allow-read --allow-write --allow-env --allow-plugin --unstable websocket.ts
