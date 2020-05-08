const routeModule = require('../route-module.js');

module.exports = function(route, query){
  let includeWorker = ('worker' in query);
  let modules = routeModule(route);

  return /* javascript */`import Entry from '${modules.page}';
import { h, render } from '/web_modules/preact.js';
import { Application } from '/web_modules/@matthewp/pwa-framework.js';

let value = {};
${includeWorker ?
/* javascript */ `let worker = new Worker('${modules.worker}', { type: 'module' });
worker.postMessage = worker.postMessage.bind(worker);
value.worker = worker;` : ''}

let params = {};
if(self.APP_DATA) {
  params.data = JSON.parse(APP_DATA);
}

const app = document.querySelector('#app');
render(h(Application.Provider, { value }, h(Entry, params)), app);`;
};