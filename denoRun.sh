#!/bin/bash

deno run -c tsconfig.json --allow-net --allow-write --allow-read --allow-plugin --allow-env --unstable server.ts
