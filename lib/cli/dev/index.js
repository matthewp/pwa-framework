const fastify = require('fastify')({ logger: true });
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

global.fetch = fetch;

const { spawn } = require('child_process');

const hookRequire = require('./hook-require.js');
const compiler = require('../../compile/modules.js');
const compileStart = require('../../compile/start.js');

const compileWeb = compiler(true);

fastify.register(require('fastify-static'), {
  root: path.join(process.cwd(), 'web_modules'),
  prefix: '/web_modules/'
});

fastify.get('/@modules/*', async (request, reply) => {
  reply.type('text/javascript');
  let srcPath = request.params['*'];
  return compileWeb(srcPath);
});

fastify.get('/@workers/*', async (request, reply) => {
  reply.type('text/javascript');
  let star = request.params['*'];

  return /* javascript */ `import component from '/@modules/routes/models/${star}';
import { hook } from '/web_modules/@matthewp/pwa-framework/worker.js';

hook(component)();`;
});

fastify.get('/start.js', async (request, reply) => {
  reply.type('text/javascript');
  return compileStart();
});

fastify.register(require('../../preact-routes.js'), {
  public: path.join(process.cwd(), 'public')
});

function runSnowpack() {
  let args = ['--dest', 'web_modules'];
  let snowpackpath = require.resolve('snowpack');
  let bin = path.join(path.dirname(snowpackpath), 'index.bin.js');
  const proc = spawn(bin, args, {
    stdio: 'inherit'
  });

  return new Promise(resolve => {
    proc.on('close', code => {
      if(code === 1) process.exit(1);
      resolve();
    });
  });
}

async function run() {  
  hookRequire();
  await runSnowpack();

  await fastify.listen(3000);
  fastify.log.info(`server listening on ${fastify.server.address().port}`);
}

run().catch(err => {
  fastify.log.error(err);
  process.exit(1);
});