import { describe, expect, test } from "bun:test";
import {
  addVectors,
  angleBetweenVectors,
  crossVectors,
  divideVector,
  dotVectors,
  lerpVectors,
  limitVector,
  multiplyVector,
  normalizeVector,
  randomVector2D,
  randomVector3D,
  rotateVector,
  setVectorMagnitude,
  subtractVectors,
  vectorDistance,
  vectorHeading,
  vectorMagnitude,
} from "./vector-math";

const u = { x: 5, y: 2, z: 0 };
const v = { x: 3, y: 4, z: 0 };

describe("vector arithmetic", () => {
  test("adds, subtracts, multiplies, and divides", () => {
    expect(addVectors(u, v)).toEqual({ x: 8, y: 6, z: 0 });
    expect(subtractVectors(u, v)).toEqual({ x: 2, y: -2, z: 0 });
    expect(multiplyVector(u, 2)).toEqual({ x: 10, y: 4, z: 0 });
    expect(divideVector(u, 2)).toEqual({ x: 2.5, y: 1, z: 0 });
    expect(() => divideVector(u, 0)).toThrow(RangeError);
  });

  test("measures, sets, normalizes, and limits magnitude", () => {
    const vector = { x: 3, y: 4, z: 0 };
    expect(vectorMagnitude(vector)).toBe(5);
    const resized = setVectorMagnitude(vector, 10);
    expect(resized.x).toBeCloseTo(6);
    expect(resized.y).toBeCloseTo(8);
    expect(resized.z).toBe(0);
    expect(vectorMagnitude(normalizeVector(vector))).toBeCloseTo(1);
    expect(normalizeVector({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
    const limited = limitVector(vector, 3);
    expect(limited.x).toBeCloseTo(1.8);
    expect(limited.y).toBeCloseTo(2.4);
    expect(limited.z).toBe(0);
    expect(limitVector(vector, 8)).toEqual(vector);
  });

  test("returns headings, rotations, and interpolation", () => {
    expect(vectorHeading({ x: 0, y: -2, z: 0 })).toBe(270);
    const rotated = rotateVector({ x: 2, y: 0, z: 1 }, 90);
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(2);
    expect(rotated.z).toBe(1);
    expect(lerpVectors(u, v, 0.25)).toEqual({ x: 4.5, y: 2.5, z: 0 });
  });

  test("compares two vectors", () => {
    expect(vectorDistance(u, v)).toBeCloseTo(Math.sqrt(8));
    expect(
      angleBetweenVectors({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }),
    ).toBe(90);
    expect(dotVectors(u, v)).toBe(23);
    expect(crossVectors({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toEqual({
      x: 0,
      y: 0,
      z: 1,
    });
  });

  test("creates unit random vectors in two and three dimensions", () => {
    expect(randomVector2D(() => 0)).toEqual({ x: 1, y: 0, z: 0 });
    expect(vectorMagnitude(randomVector2D(() => 0.37))).toBeCloseTo(1);
    expect(vectorMagnitude(randomVector3D(() => 0.37))).toBeCloseTo(1);
  });
});
