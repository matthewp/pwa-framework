
module.exports = function(){
  return /* javascript */`import Entry from '/@modules/routes/pages/index.js';
import { h, render } from '/web_modules/preact.js';
import { Application } from '@matthewp/pwa-framework';

// TODO this should be conditional, not all pages have a worker.
let worker = new Worker('/@workers/index.js', { type: 'module' });

let params = {};
if(self.APP_DATA) {
  params.data = JSON.parse(APP_DATA);
}

const app = document.querySelector('#app');
render(h(Application, { value: { worker } }, h(Entry, params)), app);`;
};