const Module = require('module');
const compiler = require('../../compile/modules.js');
const compileNode = compiler(false, ['imports']);

const matches = new RegExp(`${process.cwd().replace('/', '\/')}\/(routes|components|entry-server)`);

module.exports = function() {
  const orig = Module._extensions['.js'];
  Module._extensions['.js'] = function(module, filename) {

    if(matches.test(filename)) {
      let source = compileNode(filename);
      module._compile(source, filename);
      return;
    }

    return orig.apply(this, arguments);
  }
};