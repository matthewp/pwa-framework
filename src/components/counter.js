import { Fragment, h } from 'preact';
import { useState } from 'preact/hooks';

export default function Counter() {
  let [count, setCount] = useState(0);

  return (
    <Fragment>
      <h2>Counter</h2>
      Count: <strong>{count}</strong>

      <br />
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </Fragment>
  );
}