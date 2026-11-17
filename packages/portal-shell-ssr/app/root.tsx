import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { remotes } from "./remotes.server";

export function loader() {
  return { remotes };
}

/** JSON that is safe inside an inline <script>. */
function scriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const remotes = useRouteLoaderData<typeof loader>("root")?.remotes;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {remotes && (
          // Runs before the client entry (a deferred module), which registers the same
          // remotes before hydrating, so the browser loads what the server rendered.
          <script
            dangerouslySetInnerHTML={{ __html: `window.__MF_REMOTES__ = ${scriptJson(remotes)};` }}
          />
        )}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html {
                font-family: sans-serif;
                background: #eee;
              }
              .main-nav ul {
                background: white;
                padding: 10px 20px;
                list-style: none;
                border-radius: 10px;
              }
              .main-nav li {
                font-size: 20px;
                display: inline-flex;
                margin-right: 20px;
              }
              .main-nav a {
                color: #369;
                text-decoration: none;
              }
              .main-nav a.active {
                font-weight: bold;
              }
              .loading-placeholder {
                padding: 2rem;
                color: #666;
              }
            `,
          }}
        />
      </head>
      <body>
        <header>
          <h1>Federated App (SSR)</h1>
          <nav className="main-nav">
            <ul>
              <li>
                <NavLink to="/">Home</NavLink>
              </li>
              <li>
                <NavLink to="/table">Table</NavLink>
              </li>
              <li>
                <NavLink to="/counter">Counter</NavLink>
              </li>
              <li>
                <NavLink to="/people">People</NavLink>
              </li>
            </ul>
          </nav>
        </header>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
