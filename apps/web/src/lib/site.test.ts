import { afterEach, beforeEach, expect, test } from "bun:test";

import { getSiteUrl } from "./site";

const variableNames = [
  "SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const originalValues = {
  SITE_URL: process.env.SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL,
};

const clearVariables = () => {
  delete process.env.SITE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.VERCEL_URL;
};

beforeEach(clearVariables);

afterEach(() => {
  clearVariables();

  for (const name of variableNames) {
    const original = originalValues[name];

    if (original !== undefined) {
      process.env[name] = original;
    }
  }
});

test("local development defaults to localhost", () => {
  expect(getSiteUrl().origin).toBe("http://localhost:3000");
});

test("an explicit site URL takes precedence over Vercel domains", () => {
  process.env.SITE_URL = "https://example.com";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "production.vercel.app";
  process.env.VERCEL_URL = "preview.vercel.app";
  expect(getSiteUrl().origin).toBe("https://example.com");
});

test("Vercel production domain takes precedence over a deployment URL", () => {
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "production.vercel.app";
  process.env.VERCEL_URL = "preview.vercel.app";
  expect(getSiteUrl().origin).toBe("https://production.vercel.app");
});

test("the deployment URL is used when no production domain is available", () => {
  process.env.VERCEL_URL = "preview.vercel.app";
  expect(getSiteUrl().origin).toBe("https://preview.vercel.app");
});
