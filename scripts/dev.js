const fastify = require('fastify')({ logger: true });
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

global.fetch = fetch;

const LRUCache = require('lru-cache');

const { spawn } = require('child_process');
const { transform } = require('sucrase');

const { h } = require('preact');
const { render: renderToString } = require('preact-render-to-string');
const Helmet = require('preact-helmet');

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, '..', 'web_modules'),
  prefix: '/web_modules/'
});

const patternImport = new RegExp(/import(?:["'\s]*([\w*${}\n\r\t, ]+)from\s*)?["'\s]["'\s](.*[@\w_-]+)["'\s].*;$/, 'mg');
const patternDImport = new RegExp(/import\((?:["'\s]*([\w*{}\n\r\t, ]+)\s*)?["'\s](.*([@\w_-]+))["'\s].*\);$/, 'mg');

const fileCache = new LRUCache({ max: 1024 });

fastify.get('/@modules/*', async (request, reply) => {
  reply.type('text/javascript');
  let star = request.params['*'];
  let srcPath = path.join('src', star);

  let { mtime } = await fs.stat(srcPath);

  if(fileCache.has(srcPath)) {
    let cache = fileCache.get(srcPath);
    let diff = mtime - cache.mtime;

    if(diff === 0) {
      return cache.content;
    }
  }

  let rawContent = await fs.readFile(srcPath, 'utf8');
  let transformedContent = transform(rawContent, {
    transforms: ['jsx'],
    jsxPragma: 'h',
    jsxFragmentPragma: 'Fragment',
    production: true
  }).code;

  let content = transformedContent.replace(patternImport, (stmt, identifiers, spec) => {
    if(spec[0] !== '.' && spec[0] !== '/') {
      spec = '/web_modules/' + spec + '.js';
    }
    return `\nimport ${identifiers}from '${spec}';`;
  });

  fileCache.set(srcPath, { mtime, content });
  return content;
});

fastify.get('/@workers/*', async (request, reply) => {
  reply.type('text/javascript');
  let star = request.params['*'];

  return /* javascript */ `
    import * as mod from '/@modules/models/${star}';

    addEventListener('message', async event => {
      let {type, args} = event.data;
      let data = await mod[type](...args);
      postMessage({ type, data })
    });
  `;

});

fastify.get('/start.js', async (request, reply) => {
  reply.type('text/javascript');
  return `
    import Entry from '/@modules/routes/index.js';
    import { h, render } from '/web_modules/preact.js';

    const worker = new Worker('/@workers/index.js', { type: 'module' });

    const queue = new Map();
    worker.addEventListener('message', event => {
      let t = event.data.type;
      if(queue.has(t)) {
        let q = queue.get(t);
        let dfd = q.shift();
        dfd.resolve(event.data.data);
        if(!q.length) {
          queue.delete(t);
        }
      }
    });
    
    function enqueue(name) {
      let dfd = {};
      dfd.promise = new Promise((resolve, reject) => {
        dfd.resolve = resolve;
        dfd.reject = reject;
      });
      if(!queue.has(name)) {
        queue.set(name, []);
      }
      queue.get(name).push(dfd);
      return dfd.promise;
    }

    let model = {
      async getGists(...args) {
        worker.postMessage({ type: 'getGists', args });
        return enqueue('getGists');
      }
    };

    let params = { model };
    if(self.APP_DATA) {
      params.data = JSON.parse(APP_DATA);
    }

    const app = document.querySelector('#app');
    render(h(Entry, params), app);
  `;
});

function trimData(data, callback) {
  let usedMap = new Map();
  let usedKeys = new Map();
  function trackUsage(obj) {
    let used = new Map();
    let proxy = new Proxy(obj, {
      get(target, key) {
        let value = target[key];
        let type = typeof value;

        if(type === 'function') {
          return value;
        }

        if(used.has(key)) {
          return used.get(key);
        } else {
          if(type === 'object') {
            let proxy = trackUsage(value);
            used.set(key, proxy);
            return proxy;
          } else {
            used.set(key, value);
            return value;
          } 
        }
      },
      ownKeys(target) {
        let keys = Reflect.ownKeys(target);
        let keysProxy = trackUsage(keys);
        usedKeys.set(proxy, keysProxy);
        return keysProxy;
      }
    });
    usedMap.set(proxy, used);
    return proxy;
  }

  let proxy = trackUsage(data);

  function trim(data) {
    let used = usedMap.get(data);

    if(typeof data === 'object') {
      let out = Array.isArray(data) ? [] : {};
      for(let [key, value] of used) {
        out[key] = trim(value);
      }

      let keysUsed = usedKeys.get(data);
      if(keysUsed) {
        for(let key of keysUsed) {
          out[key] = trim(data[key]);
        }
      }
      return out;
    } else {
      return data;
    }
  }

  callback(proxy);
  return trim(proxy);
}

function layout(content, data = null) {
  const head = Helmet.rewind();

  return /* html */ `<!doctype html>
<html lang="en">
<meta charset="utf-8">
${head.title.toString()}${head.meta.toString()}${head.link.toString()}
<script type="module" src="start.js"></script>
<div id="app">${content}</div>${data ?
/* html */`<script>APP_DATA='${JSON.stringify(data)}'</script>` : ''}`;
}

fastify.get('/*', async (request, reply) => {
  let star = request.params['*'];
  let modulePath = path.join('..', 'out', 'node', 'routes', star, 'index.js');
  
  try {
    let module = require(modulePath);
    let params = {};

    try {
      try {
        let modelPath = path.join('..', 'out', 'node', 'models', star, 'index.js');
        let modelModule = require(modelPath);
        params.model = modelModule;
      } catch {}

      let html, data;
      if(module.load) {
        data = await module.load(params);
        data = trimData(data, data => {
          params.data = data;
          let vdom = h(module.default, params);
          html = renderToString(vdom);
        });
      } else {
        let vdom = h(module.default, params);
        html = renderToString(vdom);
      }
      
      reply.type('text/html');
      return layout(html, data);
    } catch(err) {
      reply.status(400);
      return err.toString();
    }
  } catch {
    reply.status(404);
    // TODO reply with 404 page.
    return 'Not found';
  }
});

function runSnowpack() {
  let args = ['--dest', 'web_modules'];
  const proc = spawn('node_modules/.bin/snowpack', args, {
    stdio: 'inherit'
  });

  return new Promise(resolve => {
    proc.on('close', code => {
      if(code === 1) process.exit(1);
      resolve();
    });
  });
}

function runSucrase() {
  let args = [
    './src',
    '-d', path.join('out', 'node'),
    '--transforms', 'jsx,imports',
    '--jsx-pragma', 'h',
    '--jsx-fragment-pragma', 'Fragment',
    '--production'
  ];

  const proc = spawn('node_modules/.bin/sucrase', args, {
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
  await fs.mkdir('out/node', { recursive: true });
  await runSnowpack();
  await runSucrase();

  await fastify.listen(3000);
  fastify.log.info(`server listening on ${fastify.server.address().port}`);
}

run().catch(err => {
  fastify.log.error(err);
  process.exit(1);
});