import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  const updateCount = () => setCount(count + 1);

  return (
    <>
      <h2>Counter Application</h2>
      <p>{count}</p>
      <button onClick={() => updateCount()} onKeyPress={() => updateCount()}>
        Increment
      </button>
    </>
  );
}

export default Counter;
