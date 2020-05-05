const fp = require('fastify-plugin');
const { PassThrough } = require('readable-stream');
const path = require('path');
const send = require('send');
const url = require('url');

const { h } = require('preact');
const { render: renderToString } = require('preact-render-to-string');
const Helmet = require('preact-helmet');

function pumpSendToReply (sendOptions, request, reply, pathname, rootPath) {
  var options = Object.assign({}, sendOptions)

  if (rootPath) {
    options.root = rootPath
  }

  const stream = send(request.raw, pathname, options)
  var resolvedFilename
  stream.on('file', function (file) {
    resolvedFilename = file
  })

  const wrap = new PassThrough({
    flush (cb) {
      this.finished = true
      if (reply.res.statusCode === 304) {
        reply.send('')
      }
      cb()
    }
  })

  wrap.getHeader = reply.getHeader.bind(reply)
  wrap.setHeader = reply.header.bind(reply)
  wrap.socket = request.raw.socket
  wrap.finished = false

  Object.defineProperty(wrap, 'filename', {
    get () {
      return resolvedFilename
    }
  })
  Object.defineProperty(wrap, 'statusCode', {
    get () {
      return reply.res.statusCode
    },
    set (code) {
      reply.code(code)
    }
  })

  wrap.on('pipe', function () {
    reply.send(wrap)
  })

  /*
  if (setHeaders !== undefined) {
    stream.on('headers', setHeaders)
  }
  */

  stream.on('directory', function (res, path) {
    if (opts.redirect === true) {
      const parsed = url.parse(request.raw.url)
      reply.redirect(301, parsed.pathname + '/' + (parsed.search || ''))
    } else {
      reply.callNotFound()
    }
  })

  stream.on('error', function (err) {
    if (err) {
      if (err.code === 'ENOENT') {
        return reply.callNotFound()
      }
      reply.send(err)
    }
  })

  // we cannot use pump, because send error
  // handling is not compatible
  stream.pipe(wrap)
}

function layout(content, data = null) {
  //const head = Helmet.rewind();
  const Head = require(path.join(process.cwd(), 'components', 'Head.js')).default;
  let head = Head.rewind().map(renderToString).join('');

  return /* html */ `<!doctype html>
<html lang="en">
<meta charset="utf-8">
${head}
<script type="module" src="start.js"></script>
<!-- HACK remove immediate -->
<body class="dark-mode">
<div id="app">${content}</div>${data ?
/* html */`<script>APP_DATA='${JSON.stringify(data)}'</script>` : ''}`;
}

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

function fastifyPreactRoutes(fastify, opts, next) {
  const sendOptions = {
    root: opts.public,
    acceptRanges: opts.acceptRanges,
    cacheControl: opts.cacheControl,
    dotfiles: opts.dotfiles,
    etag: opts.etag,
    extensions: opts.extensions,
    immutable: opts.immutable,
    index: opts.index,
    lastModified: opts.lastModified,
    maxAge: opts.maxAge
  }

  async function tryRenderPage(request, reply) {
    let star = request.params['*'];
    let modulePath = path.join(process.cwd(), 'routes', 'pages', star, 'index.js');
    
    try {
      let module = require(modulePath);
      let params = {};
  
      try {
        try {
          let modelPath = path.join(process.cwd(), 'routes', 'models', star, 'index.js');
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
      // Not found
      return null;
    }
  }

  fastify.get('/*', function(request, reply) {
    tryRenderPage(request, reply).then(html => {
      if(html) {
        reply.send(html);
      } else {
        pumpSendToReply(sendOptions, request, reply, '/' + request.params['*']);
      }
    });
  });

  next();
}

module.exports = fp(fastifyPreactRoutes, {
  fastify: '2.x',
  name: 'fastify-preact-routes'
})