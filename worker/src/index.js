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

let hasChanged = local => !local.deps || !local.last || local.deps.some((val, i) => local.last[i] !== val);

let useEffect = use.bind(null, (local, fn, deps) => {
  local.deps = deps;
  local.fn = fn;
  if(!local.call) {
    state.effects.push(local);
    local.call = () => {
      if(hasChanged(local)) {
        local.fn();
      }
      local.last = local.deps;
    };
  }
});

let useMemo = use.bind(null, (local, fn, deps) => {
  local.deps = deps;
  if(!local.val) {
    if(hasChanged(local)) {
      local.val = fn();
    }
    local.last = deps;
  }
  return local.val;
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

export { hook, useMessage, useEffect, useMemo, useReducer };