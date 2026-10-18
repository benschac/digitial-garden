export const revision = "1.4.4-canary.1+c0e1716f1";

// Official canary assets verified against GitHub release metadata. The moving
// canary URL must still match these hashes; updating the pin is deliberate.
export const archives = {
  "darwin-arm64": {
    name: "bun-darwin-aarch64",
    sha256: "0c5a8fa00204430aaee08102da6a7dee65ce57a64d752332ca6f301d4a331878",
  },
  "darwin-x64": {
    name: "bun-darwin-x64",
    sha256: "ce68ad0e7f4adc150d1d3dca0b7657961a2aa7d5804a7896d921e750f7f4d6bc",
  },
  "linux-arm64": {
    name: "bun-linux-aarch64",
    sha256: "f576c17b3c5495cedeecb11fa8387da4261a2d80754b55de15f892cc532916b3",
  },
  "linux-x64": {
    name: "bun-linux-x64",
    sha256: "eea7ccb665f2b7f61fc41ba19cce4819a9ddd28653cc7f11e6d97c4c47ddf6c8",
  },
};
