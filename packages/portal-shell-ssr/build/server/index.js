import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, Outlet, Meta, Links, NavLink, ScrollRestoration, Scripts } from "react-router";
import { useState, useEffect, Suspense } from "react";
import { loadRemote } from "@module-federation/runtime";
async function handleRequest(request, responseStatusCode, responseHeaders, routerContext) {
  const body = await renderToReadableStream(
    /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
    {
      onError(error) {
        responseStatusCode = 500;
        console.error(error);
      }
    }
  );
  if (isbot(request.headers.get("user-agent") || "")) {
    await body.allReady;
  }
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
function Layout({
  children
}) {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {}), /* @__PURE__ */ jsx("style", {
        dangerouslySetInnerHTML: {
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
            `
        }
      })]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsxs("header", {
        children: [/* @__PURE__ */ jsx("h1", {
          children: "Federated App (SSR)"
        }), /* @__PURE__ */ jsx("nav", {
          className: "main-nav",
          children: /* @__PURE__ */ jsxs("ul", {
            children: [/* @__PURE__ */ jsx("li", {
              children: /* @__PURE__ */ jsx(NavLink, {
                to: "/",
                children: "Home"
              })
            }), /* @__PURE__ */ jsx("li", {
              children: /* @__PURE__ */ jsx(NavLink, {
                to: "/table",
                children: "Table"
              })
            }), /* @__PURE__ */ jsx("li", {
              children: /* @__PURE__ */ jsx(NavLink, {
                to: "/counter",
                children: "Counter"
              })
            }), /* @__PURE__ */ jsx("li", {
              children: /* @__PURE__ */ jsx(NavLink, {
                to: "/people",
                children: "People"
              })
            })]
          })
        })]
      }), children, /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
const root = UNSAFE_withComponentProps(function Root() {
  return /* @__PURE__ */ jsx(Outlet, {});
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Layout,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
const _index = UNSAFE_withComponentProps(function Home() {
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx("h2", {
      children: "Home"
    }), /* @__PURE__ */ jsx("p", {
      children: "This is the home page, server-side rendered by the SSR shell."
    }), /* @__PURE__ */ jsxs("p", {
      children: ["Navigate to ", /* @__PURE__ */ jsx("a", {
        href: "/table",
        children: "Table"
      }), ", ", /* @__PURE__ */ jsx("a", {
        href: "/counter",
        children: "Counter"
      }), ", or ", /* @__PURE__ */ jsx("a", {
        href: "/people",
        children: "People"
      }), " to load federated micro-frontends."]
    })]
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _index
}, Symbol.toStringTag, { value: "Module" }));
const remoteCache = /* @__PURE__ */ new Map();
function useFederatedComponent(remote) {
  const [Component, setComponent] = useState(
    () => remoteCache.get(remote) ?? null
  );
  const [error, setError] = useState(null);
  useEffect(() => {
    if (Component) return;
    loadRemote(remote).then((mod) => {
      if (mod?.default) {
        remoteCache.set(remote, mod.default);
        setComponent(() => mod.default);
      } else {
        setError(new Error(`Remote "${remote}" did not export a default component`));
      }
    }).catch((err) => {
      setError(err);
    });
  }, [remote, Component]);
  return { Component, error };
}
function FederatedRemote({
  remote,
  fallback = /* @__PURE__ */ jsx("div", { className: "loading-placeholder", children: "Loading..." })
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return /* @__PURE__ */ jsx(Fragment, { children: fallback });
  }
  return /* @__PURE__ */ jsx(Suspense, { fallback, children: /* @__PURE__ */ jsx(RemoteLoader, { remote }) });
}
function RemoteLoader({ remote }) {
  const { Component, error } = useFederatedComponent(remote);
  if (error) {
    return /* @__PURE__ */ jsxs("div", { className: "loading-placeholder", children: [
      "Failed to load ",
      remote,
      ": ",
      error.message
    ] });
  }
  if (!Component) {
    return /* @__PURE__ */ jsxs("div", { className: "loading-placeholder", children: [
      "Loading ",
      remote,
      "..."
    ] });
  }
  return /* @__PURE__ */ jsx(Component, {});
}
const table_$ = UNSAFE_withComponentProps(function TableRoute() {
  return /* @__PURE__ */ jsx(FederatedRemote, {
    remote: "table/Table"
  });
});
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: table_$
}, Symbol.toStringTag, { value: "Module" }));
const counter_$ = UNSAFE_withComponentProps(function CounterRoute() {
  return /* @__PURE__ */ jsx(FederatedRemote, {
    remote: "counter/Counter"
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: counter_$
}, Symbol.toStringTag, { value: "Module" }));
const people_$ = UNSAFE_withComponentProps(function PeopleRoute() {
  return /* @__PURE__ */ jsx(FederatedRemote, {
    remote: "people/People"
  });
});
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: people_$
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BrLt9P1-.js", "imports": ["/assets/chunk-UVKPFVEO-Ds2eo5un.js", "/assets/index-DOezi9KW.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-Bq43US2A.js", "imports": ["/assets/chunk-UVKPFVEO-Ds2eo5un.js", "/assets/index-DOezi9KW.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": "/", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_index-Bxh1voIN.js", "imports": ["/assets/chunk-UVKPFVEO-Ds2eo5un.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/table.$": { "id": "routes/table.$", "parentId": "root", "path": "/table/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/table._-Bval4SJN.js", "imports": ["/assets/chunk-UVKPFVEO-Ds2eo5un.js", "/assets/federated-remote-BeZNZybJ.js", "/assets/index-DOezi9KW.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/counter.$": { "id": "routes/counter.$", "parentId": "root", "path": "/counter/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/counter._-BeicdNUZ.js", "imports": ["/assets/chunk-UVKPFVEO-Ds2eo5un.js", "/assets/federated-remote-BeZNZybJ.js", "/assets/index-DOezi9KW.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/people.$": { "id": "routes/people.$", "parentId": "root", "path": "/people/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/people._-BlxPNvrj.js", "imports": ["/assets/chunk-UVKPFVEO-Ds2eo5un.js", "/assets/federated-remote-BeZNZybJ.js", "/assets/index-DOezi9KW.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-a8bb97ec.js", "version": "a8bb97ec", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_passThroughRequests": false, "unstable_subResourceIntegrity": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: "/",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/table.$": {
    id: "routes/table.$",
    parentId: "root",
    path: "/table/*",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/counter.$": {
    id: "routes/counter.$",
    parentId: "root",
    path: "/counter/*",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/people.$": {
    id: "routes/people.$",
    parentId: "root",
    path: "/people/*",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
