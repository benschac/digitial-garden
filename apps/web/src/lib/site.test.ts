import { afterEach, beforeEach, expect, test } from "bun:test";
import { getSiteUrl } from "./site";

const variableNames = [
  "SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;
const originalValues = variableNames.map((name) => process.env[name]);

beforeEach(() => {
  for (const name of variableNames) delete process.env[name];
});

afterEach(() => {
  variableNames.forEach((name, index) => {
    const original = originalValues[index];
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  });
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
