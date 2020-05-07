import { useContext, useEffect, useReducer } from 'preact/hooks';
import { Application } from './application.js';

export function useModel(reducer, initialState) {
  let [state, send] = useReducer(reducer, initialState);
  let {worker} = useContext(Application);

  useEffect(() => {
    worker.addEventListener('message', ev => send(ev.data));
  }, []);

  return [state, worker.postMessage];
}