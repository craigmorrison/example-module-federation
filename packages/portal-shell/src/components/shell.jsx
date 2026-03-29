import Header from './header';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const Table = React.lazy(() => import('table/Table'));
const Counter = React.lazy(() => import('counter/Counter'));
const People = React.lazy(() => import('people/People'));

function Home() {
  return (
    <>
      <h2>Home</h2>
      <p>This is the home page.</p>
    </>
  );
}

function Shell() {
  return (
    <Router>
      <Header title="Federated App">
        <nav className="main-nav">
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/table">Table</Link>
            </li>
            <li>
              <Link to="/counter">Counter</Link>
            </li>
            <li>
              <Link to="/people">People</Link>
            </li>
          </ul>
        </nav>
      </Header>

      <React.Suspense fallback="Loading">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/table" element={<Table />} />
          <Route path="/counter" element={<Counter />} />
          <Route path="/people" element={<People />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default Shell;
