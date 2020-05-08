/**
 * Ex. '' -> {
 *   start: '@start/index.js',
 *   worker: '@workers/index.js',
 *   entry: 'route/pages/index.js'
 * }
 * 
 * Ex. 'reader' -> {
 *   start: '@start/reader.js',
 *   worker: '@workers/reader.js',
 *   entry: 'routes/pages/reader/index.js'
 * }
 */
exports.names = function(route) {
  if(route) {
    return {
      start: `@start/${route}.js`,
      worker: `@workers/${route}.js`,
      entry: `routes/pages/${route}/index.js`
    };
  } else {
    return {
      start: '@start/index.js',
      worker: '@workers/index.js',
      entry: 'routes/pages/index.js'
    };
  }
};

exports.startPath = function(route, includeWorker) {
  let names = exports.names(route);
  let out = '/' + names.start;
  if(includeWorker) {
    out += '?worker';
  }
  return out;
};

exports.modelForWorker = function(workerRoute) {
  if(workerRoute === 'index.js') {
    return '@modules/routes/models/index.js';
  } else {
    let route = removeExtension(workerRoute);
    return `@modules/routes/models/${route}/index.js`
  }
};

/**
 * @start/index.js
 *   /@modules/routes/pages/index.js
 *   /@workers/index.js
 * 
 * @start/reader.js
 *   /@modules/routes/reader/index.js
 *   /@workers/reader.js
 */
exports.startModules = function(startName) {
  if(startName === 'index') {
    return {
      page: '/@modules/routes/pages/index.js',
      worker: '/@workers/index.js'
    };
  } else {
    let route = removeExtension(startName);
    return {
      page: `@modules/routes/pages/${route}/index.js`,
      worker: `/@workers/${route}.js`
    }
  }
};

function removeExtension(str) {
  if(str.endsWith('.js')) return str.substr(0, str.length - 3);
  return str;
}