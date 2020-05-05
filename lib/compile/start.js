
module.exports = function(){
  return /* javascript */`import Entry from '/@modules/routes/pages/index.js';
import { h, render } from '/web_modules/preact.js';

/*
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

let params = { model };*/
let params = {};
if(self.APP_DATA) {
  params.data = JSON.parse(APP_DATA);
}

const app = document.querySelector('#app');
render(h(Entry, params), app);`;
};