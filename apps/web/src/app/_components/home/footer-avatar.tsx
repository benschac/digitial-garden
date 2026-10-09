import { useId } from "react";
import { AvatarArtwork } from "./avatar-artwork";
import styles from "./footer-avatar.module.css";

export function FooterAvatar() {
  const cropId = useId();
  return (
    <div
      className={styles.stage}
      style={{ clipPath: `url(#${cropId})` }}
      aria-hidden="true"
    >
      <svg
        width="0"
        height="0"
        className="absolute"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={cropId} clipPathUnits="objectBoundingBox">
            {/* Shallow rounded tabs follow the e–n, n–s, and s–c gaps. */}
            <path d="M0 0H1V.93H.86C.82 .93 .82 1 .78 1S.74 .93 .70 .93H.53C.49 .93 .49 1 .45 1S.41 .93 .37 .93H.18C.14 .93 .14 1 .10 1S.06 .93 .02 .93H0Z" />
          </clipPath>
        </defs>
      </svg>
      <div className={styles.artwork}>
        <AvatarArtwork variant="peek" className="overflow-visible" />
      </div>
    </div>
  );
}
