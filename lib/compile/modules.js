const fs = require('fs');
const LRUCache = require('lru-cache');
const { transform } = require('sucrase');

const patternImport = new RegExp(/import(?:["'\s]*([\w*${}\n\r\t, ]+)from\s*)?["'\s]["'\s](.*[@\w_-]+)["'\s].*;$/, 'mg');
const patternDImport = new RegExp(/import\((?:["'\s]*([\w*{}\n\r\t, ]+)\s*)?["'\s](.*([@\w_-]+))["'\s].*\);$/, 'mg');

function compile(fileCache, rewriteWebModules, transforms, srcPath) {
  let { mtime } = fs.statSync(srcPath);

  if(fileCache.has(srcPath)) {
    let cache = fileCache.get(srcPath);
    let diff = mtime - cache.mtime;

    if(diff === 0) {
      return cache.content;
    }
  }

  let rawContent = fs.readFileSync(srcPath, 'utf8');
  let transformedContent = transform(rawContent, {
    transforms,
    jsxPragma: 'h',
    jsxFragmentPragma: 'Fragment',
    production: true
  }).code;

  let content;
  if(rewriteWebModules) {
    content = transformedContent.replace(patternImport, (stmt, identifiers, spec) => {
      if(spec[0] !== '.' && spec[0] !== '/') {
        spec = '/web_modules/' + spec + '.js';
      }
      return `\nimport ${identifiers}from '${spec}';`;
    });
  } else {
    content = transformedContent;
  }

  fileCache.set(srcPath, { mtime, content });

  return content;
}

function compiler(rewriteWebModules, transforms = []) {
  let cache = new LRUCache({ max: 1024 });
  let t = Object.freeze(['jsx'].concat(transforms));
  return compile.bind(null, cache, rewriteWebModules, t);
}

module.exports = compiler;