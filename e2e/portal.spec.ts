import { expect, test } from "@playwright/test";
import people from "./fixtures/people.json" with { type: "json" };

test.describe("portal shell", () => {
  test.beforeEach(async ({ page }) => {
    // app-people-list reads SWAPI; serve a fixture so the test does not need the network.
    await page.route("https://swapi.dev/api/people*", (route) => route.fulfill({ json: people }));
  });

  test("renders the table remote (MF 2, rspack, manifest)", async ({ page }) => {
    await page.goto("/table");
    await expect(page.getByRole("heading", { name: "Table Application" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "A", exact: true })).toBeVisible();
  });

  test("renders the counter remote (native MF v1, webpack, remote entry)", async ({ page }) => {
    await page.goto("/counter");
    await expect(page.getByRole("heading", { name: "Counter Application" })).toBeVisible();
    await page.getByRole("button", { name: "Increment" }).click();
    await expect(page.getByText("1", { exact: true })).toBeVisible();
  });

  test("renders the people remote (MF 2, vite, manifest)", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: "People", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Luke Skywalker" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leia Organa" })).toBeVisible();
  });

  test("keeps the shell and the other remotes working when a remote is down", async ({ page }) => {
    await page.route("http://localhost:3001/**", (route) => route.abort());

    await page.goto("/table");
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Table is unavailable");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await page.getByRole("link", { name: "Counter" }).click();
    await expect(page.getByRole("heading", { name: "Counter Application" })).toBeVisible();
  });
});
