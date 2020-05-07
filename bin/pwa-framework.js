#!/usr/bin/env node
const [,,command] = process.argv;

if(command !== 'dev') {
  console.error('Unknown command', command);
  process.exit(1);
}

require('../lib/cli/dev/index.js');