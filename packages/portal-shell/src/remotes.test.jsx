import { Component, Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { loadRemote, registerRemotes } from "@module-federation/enhanced/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lazyRemote, registerRuntimeRemotes } from "./remotes";

vi.mock("@module-federation/enhanced/runtime", () => ({
  loadRemote: vi.fn(),
  registerRemotes: vi.fn(),
}));

class CatchError extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    return error ? <p role="alert">{error.message}</p> : this.props.children;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("registerRuntimeRemotes", () => {
  it("registers the fetched map as [{ name, entry }]", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ table: "http://localhost:3001/mf-manifest.json", counter: "/c.js" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await registerRuntimeRemotes("/custom.json");

    expect(fetchMock).toHaveBeenCalledWith("/custom.json", { cache: "no-store" });
    expect(registerRemotes).toHaveBeenCalledWith([
      { name: "table", entry: "http://localhost:3001/mf-manifest.json" },
      { name: "counter", entry: "/c.js" },
    ]);
  });

  it("defaults to /remotes.json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await registerRuntimeRemotes();

    expect(fetchMock).toHaveBeenCalledWith("/remotes.json", { cache: "no-store" });
  });

  it("throws a clear error on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(registerRuntimeRemotes("/remotes.json")).rejects.toThrow(
      "Could not load remotes config /remotes.json (HTTP 404)",
    );
    expect(registerRemotes).not.toHaveBeenCalled();
  });
});

describe("lazyRemote", () => {
  const renderLazy = (id) => {
    const Remote = lazyRemote(id);
    return render(
      <Suspense fallback={<p>loading</p>}>
        <Remote />
      </Suspense>,
    );
  };

  it("renders a module's default export", async () => {
    loadRemote.mockResolvedValue({ default: () => <p>default export</p> });

    renderLazy("table/Table");

    expect(await screen.findByText("default export")).toBeTruthy();
    expect(loadRemote).toHaveBeenCalledWith("table/Table");
  });

  it("wraps a module with no default export", async () => {
    loadRemote.mockResolvedValue(() => <p>bare component</p>);

    renderLazy("counter/Counter");

    expect(await screen.findByText("bare component")).toBeTruthy();
  });

  it.each([null, undefined])("rejects when loadRemote returns %s", async (value) => {
    loadRemote.mockResolvedValue(value);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Remote = lazyRemote("missing/Thing");

    render(
      <CatchError>
        <Suspense fallback={<p>loading</p>}>
          <Remote />
        </Suspense>
      </CatchError>,
    );

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Remote module missing/Thing could not be loaded",
    );
  });
});
