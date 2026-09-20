"use client";

import dynamic from "next/dynamic";
import { typographyVariants } from "@/components/page-typography";
import styles from "./perlin-noise-styles";

/**
 * Displays a stable placeholder while the route-local Three.js bundle loads.
 *
 * @returns An accessible loading region with the same footprint as the 3D scene.
 */
function Noise3DLoading() {
  return (
    <section className={styles.threeExperiment} aria-busy="true">
      <div
        className={typographyVariants({
          variant: "experimentNoiseThreeLoading",
          className: styles.threeLoading,
        })}
      >
        Loading the 3D comparison…
      </div>
    </section>
  );
}

/**
 * Lazily loads the React Three Fiber experiment only in the browser.
 *
 * Keeping this boundary separate prevents Three.js from joining the initial
 * static page bundle and avoids attempting to create WebGL state on the server.
 */
export const PerlinNoise3DExperiment = dynamic(
  () =>
    import("./perlin-noise-3d-experiment").then(
      (module) => module.PerlinNoise3DExperiment,
    ),
  { loading: Noise3DLoading, ssr: false },
);
