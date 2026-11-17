import { expect, test, type Page } from "@playwright/test";
import people from "./fixtures/people.json" with { type: "json" };

// The React Router shell on :4000. people-list publishes an SSR remote entry, so the
// shell renders it on the server; table and counter don't, so they are client-only
// islands. React Query doesn't fetch during a server render, so the server HTML holds
// the people list's loading state and the server never calls SWAPI.

/** Collects console errors and uncaught exceptions, e.g. hydration mismatches. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("SSR shell: server HTML", () => {
  test("server-renders the people remote through its SSR entry", async ({ request }) => {
    const response = await request.get("/people");
    expect(response.status()).toBe(200);
    const html = await response.text();

    // A browser gets the shell first and the remote streamed into the same response once
    // it loads: the remote's own markup (Emotion styles and its loading state) is in
    // the HTML, and the boundary wasn't handed to the client ("<!--$!-->").
    expect(html).toMatch(/<style data-emotion="css [\w-]+">/);
    expect(html).toContain("<p>LOADING</p>");
    expect(html).not.toContain("<!--$!-->");
  });

  test("inlines the people remote for crawlers", async ({ request }) => {
    // entry.server.tsx waits for every boundary for bots, so the markup is in place.
    const response = await request.get("/people", { headers: { "user-agent": "Googlebot" } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/<!--\$--><style data-emotion="css [\w-]+">/);
    expect(html).toContain("<p>LOADING</p>");
    expect(html).not.toContain("Loading people/People");
  });

  for (const [path, remote] of [
    ["/table", "table/Table"],
    ["/counter", "counter/Counter"],
  ]) {
    test(`leaves ${remote} to the client (no SSR entry)`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain(`<div class="loading-placeholder">Loading <!-- -->${remote}`);
    });
  }
});

test.describe("SSR shell: in the browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://swapi.dev/api/people*", (route) => route.fulfill({ json: people }));
  });

  test("hydrates the server-rendered people remote without errors", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: "People", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Luke Skywalker" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leia Organa" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("renders the table remote on the client", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/table");
    await expect(page.getByRole("heading", { name: "Table Application" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "A", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("renders the counter remote on the client and it responds", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/counter");
    await expect(page.getByRole("heading", { name: "Counter Application" })).toBeVisible();
    await page.getByRole("button", { name: "Increment" }).click();
    await expect(page.getByText("1", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("keeps the page working when a client-only remote is down", async ({ page }) => {
    await page.route("http://localhost:3001/**", (route) => route.abort());
    await page.goto("/table");
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Failed to load table/Table");

    await page.getByRole("link", { name: "Counter" }).click();
    await expect(page.getByRole("heading", { name: "Counter Application" })).toBeVisible();
  });
});
