export function acceleration(forceNewtons: number, massKilograms: number) {
  if (massKilograms <= 0) {
    throw new RangeError("Mass must be greater than zero.");
  }

  return forceNewtons / massKilograms;
}

export function velocitiesAfterImpulse(
  impulseNewtonSeconds: number,
  firstMassKilograms: number,
  secondMassKilograms: number,
) {
  if (firstMassKilograms <= 0 || secondMassKilograms <= 0) {
    throw new RangeError("Both masses must be greater than zero.");
  }

  return {
    first: -impulseNewtonSeconds / firstMassKilograms,
    second: impulseNewtonSeconds / secondMassKilograms,
  };
}

export function advancePosition(
  positionMeters: number,
  velocityMetersPerSecond: number,
  deltaSeconds: number,
) {
  return positionMeters + velocityMetersPerSecond * Math.max(0, deltaSeconds);
}
