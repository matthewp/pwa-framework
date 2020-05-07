const Module = require('module');
const compiler = require('../../compile/modules.js');
const compileNode = compiler(false, ['imports']);

module.exports = function(root) {
  const matches = new RegExp(`${root.replace('/', '\/')}`);

  const orig = Module._extensions['.js'];
  Module._extensions['.js'] = function(module, filename) {

    if(matches.test(filename)) {
      let result = compileNode(filename);
      let source = result.content;
      module._compile(source, filename);
      return;
    }

    return orig.apply(this, arguments);
  }
};