import { expect, test } from "@playwright/test";
import people from "./fixtures/people.json" with { type: "json" };
import { PEOPLE_PORT } from "../playwright.ssr-prod.config";

// Production SSR shell (see playwright.ssr-prod.config.ts). MF_REMOTES points people at
// PEOPLE_PORT; nothing serves its build-time default, :3003.
const overriddenManifest = `http://localhost:${PEOPLE_PORT}/mf-manifest.json`;

test("server-renders the built people remote from the overridden URL", async ({ request }) => {
  const response = await request.get("/people", { headers: { "user-agent": "Googlebot" } });
  expect(response.status()).toBe(200);
  const html = await response.text();

  expect(html).toMatch(/<!--\$--><style data-emotion="css [\w-]+">/);
  expect(html).toContain("<p>LOADING</p>");
  expect(html).not.toContain("Loading people/People");
  // The same map is handed to the browser.
  expect(html).toContain(`"people":"${overriddenManifest}"`);
});

test("hydrates people in the browser from the overridden URL", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const peopleRequests: string[] = [];
  page.on("request", (req) => {
    if (/localhost:(3003|3005)\//.test(req.url())) peopleRequests.push(req.url());
  });
  await page.route("https://swapi.dev/api/people*", (route) => route.fulfill({ json: people }));

  await page.goto("/people");
  await expect(page.getByRole("heading", { name: "People", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Luke Skywalker" })).toBeVisible();

  expect(errors).toEqual([]);
  expect(peopleRequests).toContain(overriddenManifest);
  expect(peopleRequests.filter((url) => url.includes(":3003/"))).toEqual([]);
});

test("renders the table remote on the client", async ({ page }) => {
  await page.goto("/table");
  await expect(page.getByRole("heading", { name: "Table Application" })).toBeVisible();
});
