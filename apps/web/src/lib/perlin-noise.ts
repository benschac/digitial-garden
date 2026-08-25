const PERMUTATION = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
  36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234,
  75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237,
  149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48,
  27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105,
  92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73,
  209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
  164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38,
  147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189,
  28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101,
  155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
  178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12,
  191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31,
  181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
  138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215,
  61, 156, 180,
] as const;

/**
 * Samples deterministic two-dimensional improved Perlin noise.
 *
 * The function locates the unit grid cell containing `(x, y)`, hashes the
 * cell's four corners into gradient directions, measures how strongly each
 * gradient points toward the sample, and smoothly blends those four dot
 * products. The fixed permutation table makes the same coordinates return the
 * same value in every run and matches the Rust implementation byte-for-byte.
 *
 * @param x - Horizontal position in noise space. Fractional values move within
 * a lattice cell; adding 256 repeats the same gradients.
 * @param y - Vertical position in noise space. Fractional values move within a
 * lattice cell; adding 256 repeats the same gradients.
 * @returns A noise value near `[-1, 1]`. Integer lattice intersections return
 * positive zero, while a non-finite coordinate returns `NaN`.
 */
export function perlinNoise2D(x: number, y: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return Number.NaN;
  }

  const xFloor = Math.floor(x);
  const yFloor = Math.floor(y);
  const latticeX = latticeIndex(xFloor);
  const latticeY = latticeIndex(yFloor);
  const offsetX = x - xFloor;
  const offsetY = y - yFloor;
  const fadeX = fade(offsetX);
  const fadeY = fade(offsetY);

  const left = PERMUTATION[latticeX];
  const right = PERMUTATION[(latticeX + 1) % 256];
  const bottomLeft = PERMUTATION[(left + latticeY) % 256];
  const topLeft = PERMUTATION[(left + latticeY + 1) % 256];
  const bottomRight = PERMUTATION[(right + latticeY) % 256];
  const topRight = PERMUTATION[(right + latticeY + 1) % 256];

  const bottom = lerp(
    gradientDot(bottomLeft, offsetX, offsetY),
    gradientDot(bottomRight, offsetX - 1, offsetY),
    fadeX,
  );
  const top = lerp(
    gradientDot(topLeft, offsetX, offsetY - 1),
    gradientDot(topRight, offsetX - 1, offsetY - 1),
    fadeX,
  );

  const noise = lerp(bottom, top, fadeY);
  return noise === 0 ? 0 : noise;
}

/**
 * Samples deterministic three-dimensional improved Perlin noise.
 *
 * This is the 3D counterpart to {@link perlinNoise2D}: it hashes the eight
 * corners of the containing lattice cube, evaluates a gradient dot product at
 * each corner, and interpolates along X, Y, and Z with the same quintic fade
 * curve used by the Rust implementation.
 *
 * @param x - Horizontal position in noise space.
 * @param y - Vertical position in noise space.
 * @param z - Depth position in noise space. Moving only this value reveals
 * successive 2D slices through a stable 3D field.
 * @returns A deterministic noise value near `[-1, 1]`, or `NaN` when any
 * coordinate is non-finite.
 */
export function perlinNoise3D(x: number, y: number, z: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return Number.NaN;
  }

  const xFloor = Math.floor(x);
  const yFloor = Math.floor(y);
  const zFloor = Math.floor(z);
  const latticeX = latticeIndex(xFloor);
  const latticeY = latticeIndex(yFloor);
  const latticeZ = latticeIndex(zFloor);
  const offsetX = x - xFloor;
  const offsetY = y - yFloor;
  const offsetZ = z - zFloor;
  const fadeX = fade(offsetX);
  const fadeY = fade(offsetY);
  const fadeZ = fade(offsetZ);

  const left = PERMUTATION[latticeX];
  const right = PERMUTATION[(latticeX + 1) % 256];
  const bottomLeft = PERMUTATION[(left + latticeY) % 256];
  const topLeft = PERMUTATION[(left + latticeY + 1) % 256];
  const bottomRight = PERMUTATION[(right + latticeY) % 256];
  const topRight = PERMUTATION[(right + latticeY + 1) % 256];

  const nearBottom = lerp(
    gradientDot3D(
      PERMUTATION[(bottomLeft + latticeZ) % 256],
      offsetX,
      offsetY,
      offsetZ,
    ),
    gradientDot3D(
      PERMUTATION[(bottomRight + latticeZ) % 256],
      offsetX - 1,
      offsetY,
      offsetZ,
    ),
    fadeX,
  );
  const nearTop = lerp(
    gradientDot3D(
      PERMUTATION[(topLeft + latticeZ) % 256],
      offsetX,
      offsetY - 1,
      offsetZ,
    ),
    gradientDot3D(
      PERMUTATION[(topRight + latticeZ) % 256],
      offsetX - 1,
      offsetY - 1,
      offsetZ,
    ),
    fadeX,
  );
  const farBottom = lerp(
    gradientDot3D(
      PERMUTATION[(bottomLeft + latticeZ + 1) % 256],
      offsetX,
      offsetY,
      offsetZ - 1,
    ),
    gradientDot3D(
      PERMUTATION[(bottomRight + latticeZ + 1) % 256],
      offsetX - 1,
      offsetY,
      offsetZ - 1,
    ),
    fadeX,
  );
  const farTop = lerp(
    gradientDot3D(
      PERMUTATION[(topLeft + latticeZ + 1) % 256],
      offsetX,
      offsetY - 1,
      offsetZ - 1,
    ),
    gradientDot3D(
      PERMUTATION[(topRight + latticeZ + 1) % 256],
      offsetX - 1,
      offsetY - 1,
      offsetZ - 1,
    ),
    fadeX,
  );

  const near = lerp(nearBottom, nearTop, fadeY);
  const far = lerp(farBottom, farTop, fadeY);
  const noise = lerp(near, far, fadeZ);
  return noise === 0 ? 0 : noise;
}

/**
 * Wraps an integer lattice coordinate into the permutation table's 256 slots.
 *
 * JavaScript's remainder operator preserves the sign of a negative input, so
 * the second modulo converts negative remainders into the equivalent positive
 * table index.
 *
 * @param value - A floored noise-space coordinate.
 * @returns An integer index from 0 through 255.
 */
function latticeIndex(value: number): number {
  return ((value % 256) + 256) % 256;
}

/**
 * Applies Perlin's quintic fade curve, `6t⁵ - 15t⁴ + 10t³`.
 *
 * Its first and second derivatives are zero at both ends, which prevents
 * visible seams where adjacent lattice cells meet.
 *
 * @param value - Position within one lattice cell, normally from 0 through 1.
 * @returns The smoothed interpolation weight for that position.
 */
function fade(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

/**
 * Linearly interpolates between two scalar values.
 *
 * @param start - Value returned when `amount` is 0.
 * @param end - Value returned when `amount` is 1.
 * @param amount - Blend weight between `start` and `end`.
 * @returns The blended scalar.
 */
function lerp(start: number, end: number, amount: number): number {
  return start + amount * (end - start);
}

/**
 * Selects one of eight 2D gradients and dots it with a corner-to-sample offset.
 *
 * Only the hash's lowest three bits are needed to choose a direction. Returning
 * the dot product directly avoids allocating gradient vectors for every sample.
 *
 * @param hash - Permutation-table value associated with a lattice corner.
 * @param x - Horizontal displacement from that corner to the sample.
 * @param y - Vertical displacement from that corner to the sample.
 * @returns The selected gradient's signed influence at the sample.
 */
function gradientDot(hash: number, x: number, y: number): number {
  switch (hash & 7) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    case 3:
      return -x - y;
    case 4:
      return x;
    case 5:
      return -x;
    case 6:
      return y;
    default:
      return -y;
  }
}

/**
 * Selects one of the classic improved-Perlin 3D gradients and dots it with a
 * corner-to-sample offset without allocating a vector.
 *
 * @param hash - Permutation-table value associated with a lattice corner.
 * @param x - Horizontal displacement from the corner.
 * @param y - Vertical displacement from the corner.
 * @param z - Depth displacement from the corner.
 * @returns The selected gradient's signed influence at the sample.
 */
function gradientDot3D(hash: number, x: number, y: number, z: number): number {
  const direction = hash & 15;
  const first = direction < 8 ? x : y;
  const second =
    direction < 4 ? y : direction === 12 || direction === 14 ? x : z;
  const signedFirst = (direction & 1) === 0 ? first : -first;
  const signedSecond = (direction & 2) === 0 ? second : -second;
  return signedFirst + signedSecond;
}
