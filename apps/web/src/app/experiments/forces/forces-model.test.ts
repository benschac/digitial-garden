import { describe, expect, test } from "bun:test";
import {
  acceleration,
  advancePosition,
  velocitiesAfterImpulse,
} from "./forces-model";

describe("Newtonian force model", () => {
  test("computes acceleration from net force and mass", () => {
    expect(acceleration(12, 4)).toBe(3);
    expect(acceleration(12, 8)).toBe(1.5);
    expect(() => acceleration(12, 0)).toThrow(RangeError);
  });

  test("preserves constant velocity when no force acts", () => {
    expect(advancePosition(2, 3, 4)).toBe(14);
    expect(advancePosition(2, 3, -1)).toBe(2);
  });

  test("applies equal and opposite impulses", () => {
    const velocities = velocitiesAfterImpulse(9, 3, 6);

    expect(velocities).toEqual({ first: -3, second: 1.5 });
    expect(3 * velocities.first + 6 * velocities.second).toBe(0);
  });
});
