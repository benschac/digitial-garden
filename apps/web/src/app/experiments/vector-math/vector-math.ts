export type Vector = { x: number; y: number; z: number };

export const addVectors = (a: Vector, b: Vector): Vector => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
export const subtractVectors = (a: Vector, b: Vector): Vector => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const multiplyVector = (v: Vector, scalar: number): Vector => ({
  x: v.x * scalar,
  y: v.y * scalar,
  z: v.z * scalar,
});

export function divideVector(vector: Vector, scalar: number): Vector {
  if (scalar === 0) throw new RangeError("A vector cannot be divided by zero.");
  return multiplyVector(vector, 1 / scalar);
}

export const vectorMagnitude = (v: Vector): number => Math.hypot(v.x, v.y, v.z);

export function normalizeVector(vector: Vector): Vector {
  const magnitude = vectorMagnitude(vector);
  return magnitude === 0
    ? { x: 0, y: 0, z: 0 }
    : divideVector(vector, magnitude);
}

export function setVectorMagnitude(vector: Vector, magnitude: number): Vector {
  return multiplyVector(normalizeVector(vector), Math.max(0, magnitude));
}

export function limitVector(vector: Vector, maximum: number): Vector {
  const safeMaximum = Math.max(0, maximum);
  return vectorMagnitude(vector) > safeMaximum
    ? setVectorMagnitude(vector, safeMaximum)
    : { ...vector };
}

export function vectorHeading(vector: Vector): number {
  const degrees = (Math.atan2(vector.y, vector.x) * 180) / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}

export function rotateVector(vector: Vector, degrees: number): Vector {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
    z: vector.z,
  };
}

export const lerpVectors = (a: Vector, b: Vector, amount: number): Vector => ({
  x: a.x + (b.x - a.x) * amount,
  y: a.y + (b.y - a.y) * amount,
  z: a.z + (b.z - a.z) * amount,
});

export const vectorDistance = (a: Vector, b: Vector): number =>
  vectorMagnitude(subtractVectors(a, b));
export const dotVectors = (a: Vector, b: Vector): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

export function angleBetweenVectors(a: Vector, b: Vector): number {
  const magnitudeProduct = vectorMagnitude(a) * vectorMagnitude(b);
  if (magnitudeProduct === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, dotVectors(a, b) / magnitudeProduct));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export const crossVectors = (a: Vector, b: Vector): Vector => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export function randomVector2D(random: () => number = Math.random): Vector {
  const angle = random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
}

export function randomVector3D(random: () => number = Math.random): Vector {
  const z = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(1 - z * z);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z };
}
