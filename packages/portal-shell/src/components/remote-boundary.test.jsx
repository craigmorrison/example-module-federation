import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadRemote } from "@module-federation/enhanced/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RemoteBoundary from "./remote-boundary";

vi.mock("@module-federation/enhanced/runtime", () => ({
  loadRemote: vi.fn(),
  registerRemotes: vi.fn(),
}));

beforeEach(() => {
  // React logs caught render errors; keep the output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe("RemoteBoundary", () => {
  it("shows the loading fallback, then the component", async () => {
    let resolve;
    loadRemote.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<RemoteBoundary id="table/Table" name="Table" />);

    expect(screen.getByText("Loading Table...")).toBeTruthy();

    resolve({ default: () => <p>the table</p> });

    expect(await screen.findByText("the table")).toBeTruthy();
    expect(screen.queryByText("Loading Table...")).toBeNull();
  });

  it("shows an unavailable alert with Retry when the load fails", async () => {
    loadRemote.mockRejectedValue(new Error("network down"));

    render(<RemoteBoundary id="table/Table" name="Table" />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Table is unavailable");
    expect(alert.textContent).toContain("network down");
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("reloads on Retry and renders the component once it succeeds", async () => {
    loadRemote.mockRejectedValueOnce(new Error("network down"));
    loadRemote.mockResolvedValueOnce({ default: () => <p>the table</p> });
    const user = userEvent.setup();

    render(<RemoteBoundary id="table/Table" name="Table" />);
    await screen.findByRole("alert");
    expect(loadRemote).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("the table")).toBeTruthy();
    expect(loadRemote).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
