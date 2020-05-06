
module.exports = function(){
  return /* javascript */`import Entry from '/@modules/routes/pages/index.js';
import { h, render } from '/web_modules/preact.js';
import { Application } from '/web_modules/@matthewp/pwa-framework.js';

// TODO this should be conditional, not all pages have a worker.
let worker = new Worker('/@workers/index.js', { type: 'module' });

let params = {};
if(self.APP_DATA) {
  params.data = JSON.parse(APP_DATA);
}

const app = document.querySelector('#app');
render(h(Application.Provider, { value: { worker } }, h(Entry, params)), app);`;
};