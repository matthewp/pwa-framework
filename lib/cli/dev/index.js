const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

global.fetch = fetch;

const { spawn } = require('child_process');

const hookRequire = require('./hook-require.js');
const compiler = require('../../compile/modules.js');
const compileStart = require('../../compile/start.js');
const routeModule = require('../../route-module.js');

const compileWeb = compiler(true);
const SRC = path.join(process.cwd(), 'src');

fastify.register(require('fastify-static'), {
  root: path.join(process.cwd(), 'web_modules'),
  prefix: '/web_modules/'
});

fastify.get('/@modules/*', async (request, reply) => {
  let star = request.params['*'];
  let modulePath = path.join(SRC, star);

  if(modulePath.endsWith('.wasm')) {
    reply.type('application/wasm');
    let stream = fs.createReadStream(modulePath);
    reply.send(stream);
    return reply;
  } else {
    let result = compileWeb(modulePath);
    if(result.changed) {
      reply.type('text/javascript');
      return result.content;
    } else {
      reply.type('text/javascript');
      // TODO eventually support 304
      //reply.status(304);
      return result.content;
    }
  }
});

fastify.get('/@workers/*', async (request, reply) => {
  reply.type('text/javascript');
  let star = request.params['*'];
  let modelName = routeModule.modelForWorker(star);

  return /* javascript */ `import component from '/${modelName}';
import { hook } from '/web_modules/@matthewp/pwa-framework/worker.js';

hook(component)();`;
});

fastify.get('/@start/*', async (request, reply) => {
  let star = request.params['*'];
  reply.type('text/javascript');
  return compileStart(star, request.query);
});

fastify.register(require('../../preact-routes.js'), {
  public: path.join(process.cwd(), 'public'),
  src: SRC
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
  hookRequire(SRC);
  await runSnowpack();

  await fastify.listen(3000);
  fastify.log.info(`server listening on ${fastify.server.address().port}`);
}

run().catch(err => {
  fastify.log.error(err);
  process.exit(1);
});