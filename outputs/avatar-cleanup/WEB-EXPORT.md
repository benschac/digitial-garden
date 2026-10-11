# Avatar web export

| File | Purpose | Size | Triangles |
| --- | --- | --- | --- |
| avatar-surface-repaired.glb | Repaired source | 3,639,216 bytes | 198,612 |
| avatar-web-uncompressed.glb | Simplified, broadly importable | 703,960 bytes | 35,906 |
| avatar-web.glb | Meshopt compressed web asset | 183,532 bytes | 35,906 |
| avatar-web.blend | Blender comparison scenes | — | — |

Ten separately addressable mesh nodes and all four materials are retained. Node names and hierarchy match the repaired source. The Blender comparison scene is `Avatar - web optimized`.

## Reproduce

Using glTF Transform 4.5.1 (temporary CLI installation; no project dependency changes):

```sh
gltf-transform simplify avatar-surface-repaired.glb avatar-web-uncompressed.glb --ratio 0.15 --error 0.001
gltf-transform meshopt avatar-web-uncompressed.glb avatar-web.glb --level high
gltf-transform validate avatar-web.glb
```

The simplifier stops above 30,000 triangles to respect its error tolerance. The compressed file uses `EXT_meshopt_compression` and `KHR_mesh_quantization`.

## Load in Three.js

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const avatar = await loader.loadAsync('/models/avatar-web.glb');
scene.add(avatar.scene);
```

Use the uncompressed GLB for tools that cannot import Meshopt. Serve the compressed asset with HTTP gzip or Brotli where supported; the file size above is before HTTP compression.

## Local comparison

From the repository root, run `python3 outputs/avatar-cleanup/preview.py`, then open http://127.0.0.1:8766. The preview uses the existing Three.js package and serves only an explicit list of comparison files. Stop it with Ctrl-C.

Verification: front and angled Blender inspection; Chrome/Three.js loading and visual comparison at 480 px and 240 px; ten rendered parts in both versions. glTF Validator reports no errors or warnings, but does not validate the Meshopt extension itself; decoding was checked in Chrome. This is an asset comparison, not a mobile performance benchmark or a production site integration.
