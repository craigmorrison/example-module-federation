import Header from "./header";
import RemoteBoundary from "./remote-boundary";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router";

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

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/table"
          element={<RemoteBoundary key="table/Table" id="table/Table" name="Table" />}
        />
        <Route
          path="/counter"
          element={<RemoteBoundary key="counter/Counter" id="counter/Counter" name="Counter" />}
        />
        <Route
          path="/people"
          element={<RemoteBoundary key="people/People" id="people/People" name="People" />}
        />
      </Routes>
    </Router>
  );
}

export default Shell;
