
module.exports = function(route, query){
  let includeWorker = ('worker' in query);
  let pageIndex = (route ? route + '/') + 'index.js';

  return /* javascript */`import Entry from '${`/@modules/routes/pages/${routeIndex}`}';
import { h, render } from '/web_modules/preact.js';
import { Application } from '/web_modules/@matthewp/pwa-framework.js';

let value = {};
${includeWorker ?
/* javascript */ `let worker = new Worker('/@workers/${route || 'index'}.js', { type: 'module' });
worker.postMessage = worker.postMessage.bind(worker);
value.worker = worker;` : ''}

let params = {};
if(self.APP_DATA) {
  params.data = JSON.parse(APP_DATA);
}

const app = document.querySelector('#app');
render(h(Application.Provider, { value }, h(Entry, params)), app);`;
};