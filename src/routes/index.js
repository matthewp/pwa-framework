import { Fragment, h } from 'preact';
import { useEffect, useReducer, useState } from 'preact/hooks';
import Helmet from 'preact-helmet';
import Counter from '../components/counter.js';

export async function load({ model }) {
  return model.getGists();
}

function reducer(prev, action) {
  switch(action.type) {
    case 'refresh': return { name: 'refresh' };
    case 'gists': return { gists: action.gists, name: 'idle' };
  }
}

export default function({ model, data }) {
  const [state, dispatch] = useReducer(reducer, {
    name: 'idle',
    gists: data.gists || []
  });

  useEffect(async () => {
    if(state.name === 'refresh') {
      let { gists } = await model.getGists();
      dispatch({ type: 'gists', gists });
    }
  }, [state.name]);

  return (
    <Fragment>
      <Helmet title="My App"></Helmet>

      <h1>Index page</h1>
      <p>This is the index page.</p>

      <Counter />

      <h2>Gists</h2>
      <div>
        <button onClick={() => dispatch({ type: 'refresh' })}>Refresh</button>
        {state.gists ? (
          <ul>
            {state.gists.map(gist => (
              <li key={gist.id}>{Object.keys(gist.files)[0]}</li>
            ))}
          </ul>
        ) : (
          <div>Loading</div>
        )}

      </div>
    </Fragment>
  );
}