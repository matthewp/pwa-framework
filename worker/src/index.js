let current = 0;
let state = null;

function next() {
  return current++;
}

function update(state) {
  let fn = state.fn;

  setTimeout(() => {
    fn();
  })
}

function use(hook, ...args) {
  let i = next();
  let local = state.hooks[i];
  if(!local) {
    local = state.hooks[i] = {};
  }
  return hook(local, ...args);
}

let useReducer = use.bind(null, (local, reducer, value, init) => {
  if(!local.reducer) {
    local.value = init ? init(value) : value;
    local.reducer = reducer;
    local.u = update.bind(null, state);
    local.d = action => {
      let newValue = local.reducer(local.value, action);
      if(newValue !== local.value) {
        local.value = newValue;
        local.u();
      }
    };
  }
  return [local.value, local.d];
});

let useEffect = use.bind(null, (local, fn, deps) => {
  local.deps = deps;
  local.fn = fn;
  if(!local.call) {
    state.effects.push(local);
    local.call = () => {
      let change = !local.deps || !local.last || local.deps.some((val, i) => local.last[i] !== val);
      local.last = local.deps;
      if(change) {
        local.fn();
      }
    };
  }
});

function hook(orig) {
  let hooks = [], effects = [];
  return function fn(){
    let prev = state;
    current = 0;
    state = {
      fn,
      hooks,
      effects
    };

    try {
      let val = orig.apply(null, arguments);
      for(let local of state.effects) {
        local.call();
      }
      return val;
    } finally {
      current = 0;
      state = prev;
    }
  };
}

function useMessage(reducer, initialState) {
  let [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    addEventListener('message', ev => {
      dispatch(ev.data)
    });
  }, []);

  return [state, postMessage];
}

export { hook, useMessage, useEffect, useReducer };