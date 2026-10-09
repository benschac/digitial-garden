import { cn } from "@personal-site/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import styles from "./avatar-artwork.module.css";

// Geometry from public/images/avatar-pieces/avatar-layered.svg.
export function AvatarArtwork({
  variant = "hero",
  revealed = false,
  className,
}: {
  variant?: "hero" | "peek";
  revealed?: boolean;
  className?: string;
}) {
  const peek = variant === "peek";
  return (
    <svg
      viewBox={peek ? "90 40 280 230" : "0 0 460 460"}
      className={cn("block h-full w-full", styles.artwork, className)}
      data-revealed={revealed}
      aria-hidden="true"
      focusable="false"
    >
      <g className={peek ? styles.hiddenBadge : styles.badgeEntrance}>
        <g data-avatar-part="badge" data-pivot-x="230" data-pivot-y="230">
          <circle cx="230" cy="230" r="230" fill="#54C5E1" />
        </g>
      </g>
      <g className={peek ? undefined : styles.headEntrance}>
        <g data-avatar-part="head-base" data-pivot-x="230" data-pivot-y="330">
          <path
            d="M 226 49 C 191 48 167 59 148 81 C 129 103 107 130 106 153 C 105 187 107 229 109 271 C 110 309 122 343 143 371 C 164 398 194 414 229 414 C 265 415 296 401 321 376 C 340 357 350 325 352 289 C 354 249 355 204 356 160 C 357 136 339 112 319 91 C 302 71.5 292 59.2 270 53.8 C 254 49.8 241 48.6 226 49 Z"
            fill="#4F2F27"
            fillRule="nonzero"
          />
        </g>
        <g data-avatar-part="face" data-pivot-x="230" data-pivot-y="285">
          <path
            d="M 124 158 C 124 128 145 96 176 84 C 219 68 277 83 309 108 C 329 125 334 146 336 172 C 337 208 342 223 342 258 C 344 299 326 341 305 367 C 299 374 291 374 291 365 C 291 356 286 371 279 381 C 267 397 250 402 234 401 C 208 403 185 386 178 367 C 174 355 176 354 175 359 C 174.4 360.8 172.9 362 173.2 365 C 173.5 368 169 374 164 370 C 156 366 150 360 145 353 C 126 326 114 286 115 253 C 115 218 123 194 124 158 Z"
            fill="#FFF3D0"
            fillRule="nonzero"
          />
        </g>
        <g data-avatar-part="hair" data-pivot-x="230" data-pivot-y="116">
          <path
            d="M 106 153 C 107 130 129 103 148 81 C 167 59 191 48 226 49 C 241 48.6 254 49.8 270 53.8 C 292 59.2 302 71.5 319 91 C 339 112 357 136 356 160 C 349 166 342 171 336 174 C 334 146 319 120 298 105 C 286 96 268 97 253 103 C 237 111 227 124 211 125 C 198 126 179 124 168 119 C 162 115 160 110 160 107 C 158 104 156 106 154 109 C 139 125 128 141 125 158 C 124 166 123 172 120 177 C 114 173 108 163 106 153 Z"
            fill="#4F2F27"
            fillRule="nonzero"
          />
        </g>
        <g data-avatar-part="beard" data-pivot-x="232" data-pivot-y="353">
          <path
            d="M 193 308 C 218 308 238 298 262 292 C 275 287 286 292 294 303 C 302 314 299 329 296 345 C 291 369 283 392 266 405 C 249 418 221 418 202 407 C 183 396 172 378 173 357 C 173.4 349 174.2 341 175 333 C 177 317 181 309 193 308 Z M 193 320 C 219 320 243 310 265 304 C 276 301 285 309 285 319 C 285 340 274 375 261 387 C 251 398 239 403 226 401 C 213 399 193 382 189 370 C 184 357 184 339 187 327 C 188 322 190 320 193 320 Z"
            fill="#4F2F27"
            fillRule="evenodd"
          />
        </g>
        <FeatureEntrance delay={360} animate={!peek}>
          <g
            className={peek ? styles.peekBrow : undefined}
            data-avatar-part="brow-left"
            data-pivot-x="168"
            data-pivot-y="190"
          >
            <path
              d="M 145 204 C 150 190 160 180 176 180 C 186 179 192 184 192 189 C 192 194 188 195 179 195 C 163 195 154 197 145 204 Z"
              fill="#4F2F27"
              fillRule="nonzero"
            />
          </g>
        </FeatureEntrance>
        <FeatureEntrance delay={400} animate={!peek}>
          <g
            className={peek ? styles.peekBrow : undefined}
            data-avatar-part="brow-right"
            data-pivot-x="289"
            data-pivot-y="190"
          >
            <path
              d="M 268 193 C 263 187 270 180 279 179.8 C 296 177 309 187 316 204 C 304 195 295 195 282 194.5 C 275 194.3 270 194 268 193 Z"
              fill="#4F2F27"
              fillRule="nonzero"
            />
          </g>
        </FeatureEntrance>
        <FeatureEntrance delay={440} animate={!peek}>
          <g
            className={peek ? styles.peekEye : undefined}
            data-avatar-part="eye-left"
            data-pivot-x="170"
            data-pivot-y="236"
          >
            <path
              className={peek ? styles.peekBlink : undefined}
              d="M 170 216 C 178 216 184 225 184 236 C 184 247 178 257 170 257 C 162 257 155 248 155 237 C 155 226 162 216 170 216 Z"
              fill="#4F2F27"
              fillRule="nonzero"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          </g>
        </FeatureEntrance>
        <FeatureEntrance delay={480} animate={!peek}>
          <g
            className={peek ? styles.peekEye : undefined}
            data-avatar-part="eye-right"
            data-pivot-x="292"
            data-pivot-y="236"
          >
            <path
              className={peek ? styles.peekBlink : undefined}
              d="M 291 216 C 299 216 306 225 306 236 C 306 247 300 256 292 256 C 283 256 277 247 277 236 C 277 225 283 216 291 216 Z"
              fill="#4F2F27"
              fillRule="nonzero"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          </g>
        </FeatureEntrance>
        <FeatureEntrance delay={520} animate={!peek}>
          <g data-avatar-part="tongue" data-pivot-x="243" data-pivot-y="335">
            <path
              d="M 206 343 C 230 340 250 337 264 323 C 267 320 270 316 270 318 C 268 333 262 343 253 347 C 239 353 221 350 207 345 C 204 344 204 343 206 343 Z"
              fill="#F2BBB1"
              fillRule="nonzero"
            />
          </g>
        </FeatureEntrance>
      </g>
    </svg>
  );
}

// Separate wrappers preserve the tracking and blink transforms on inner layers.
function FeatureEntrance({
  children,
  delay,
  animate = true,
}: {
  children: ReactNode;
  delay: number;
  animate?: boolean;
}) {
  return (
    <g
      className={animate ? styles.featureEntrance : undefined}
      style={{ "--avatar-enter-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </g>
  );
}
