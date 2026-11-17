# Local asset workflow tool

Date: 2026-11-05

Status: Spec for review. Product scope confirmed through discussion. Technical choices below are proposals. Implementation has not been authorized or started.

## Purpose

Create reusable artwork and transparent layers through a local visual workflow inside the existing personal-site app. The tool replaces the scene-specific generation and preparation process used for the Snap-to-Post header.

The tool produces assets. It does not write blog posts or publish content. Parallax is a preview and one possible use of the exported assets.

## Confirmed scope

- One user, running the existing app locally on their machine.
- The tool stays in `apps/web` and reuses `packages/ui`. It is not a separate application.
- A small visual workflow contains reference images, style references, notes, prompts, and generated outputs.
- Styles are saved for reuse across projects. A style contains reference images and written guidance about palette, texture, composition, and exclusions.
- A composition can be generated from a prompt and optional references. The user selects and approves a composition before layer preparation.
- Each generation starts with an explicit Run action. No cost-estimate interface or automatic paid retries in v1.
- Reruns preserve previous outputs. The user selects the output that feeds the next stage.
- Changes to upstream inputs mark dependent results outdated without deleting them.
- The user can inspect, rename, reorder, hide, and adjust the motion of layers.
- Cutout defects are addressed through prompt changes and regeneration. Manual masks and pixel editing are outside v1.
- A parallax preview helps reveal gaps and poor cutouts.
- Exports include the composition, transparent layer images, and their order and placement metadata.

## Existing implementation

The owning source repository is `/Users/benjaminschachter/personal-site`. This spec is maintained in the owning repository. Original prototype inputs remain in `/Users/benjaminschachter/Documents/ChatGPT/personal-site 2`.

The current implementation provides useful reference behavior:

- [PaperValley](../../apps/web/src/app/blog/paper-valley.tsx) defines eight fixed layers and their motion. It handles image readiness, static fallback, reduced motion, pointer capability, and visibility.
- [The blog route](../../apps/web/src/app/blog/[slug]/page.tsx) selects that header through a specific post slug.
- [The motion prototype](/Users/benjaminschachter/Documents/ChatGPT/personal-site 2/outputs/header-directions/motion-prototype/README.md) documents extraction, hidden-surface reconstruction, alpha repair, and aligned exports. Its scripts are specific to that scene.
- [The shared UI package](../../packages/ui) provides controls and typography. It is not an existing workflow editor.
- [Prompt input attachments](../../apps/web/src/components/ai-elements/prompt-input-attachments.ts) provides existing attachment lifecycle behavior to inspect for reuse.
- [The standard-library directory](../standard-libraries.md) identifies existing validation, lifecycle, and runtime owners.

The existing blog header remains unchanged in this scope. Exporting assets does not automatically install them into a post.

## Proposed user experience

The initial project opens with a connected workflow already arranged on a canvas. The user does not need to construct a graph before making an asset.

The workflow contains these stages:

1. References and style. Add subject images, select a saved style, and write notes.
2. Composition. Edit the generation prompt and run it. Inspect previous outputs and select one.
3. Approval. Approve the selected composition for layer preparation.
4. Layers. Edit preparation guidance and run separation or reconstruction. Inspect the resulting layer set.
5. Preview and export. Adjust layer order, visibility, and motion. Inspect the assembled image and export the bundle.

The canvas uses familiar controls from the existing UI package. A project list and style library provide access to saved work. Selecting a stage opens its controls and output history in an adjacent inspector.

Notes are descriptive unless the user explicitly includes them in a prompt. The generation controls show the actual prompt and reference inputs sent to the provider.

V1 uses this fixed recipe with editable stage inputs. Arbitrary node types, cycles, custom code nodes, and a general-purpose workflow builder are deferred. This is a proposed scope limit, not a settled library constraint.

## Output selection and approval

A run records the exact prompt, references, style revision, model, and settings used. Later edits do not alter that record.

Selecting an output does not automatically approve it or start the next stage. Approval belongs to the selected composition and its input revision.

Changing the prompt, reference selection, style revision, or selected composition invalidates the current approval. Existing layer sets remain accessible but are marked outdated. Layer preparation requires approval of the current selection.

Saving a new style revision does not silently change existing projects. A project adopts that revision explicitly, which marks its dependent outputs outdated.

Previous runs remain available for comparison. A result that completes after inputs change is retained in history and is not automatically selected.

## Layer review and export contract

The layer inspector displays transparency against a checkerboard and offers individual-layer and assembled views. It supports a static view and pointer or scroll motion preview.

The preview respects reduced-motion settings. A manual offset control can inspect the maximum configured movement without continuous animation.

The export bundle contains:

| Item | Required contents |
| --- | --- |
| Composition | The selected flattened image at its recorded dimensions. |
| Layer images | Transparent PNG images, with stable IDs and portable filenames. WebP can be an additional format later. |
| `scene.json` | Schema version, canvas dimensions, composition path, ordered layers, offsets, image dimensions, visibility, and motion settings. |
| `provenance.json` | Prompts, provider and model identifiers, settings, input revision identifiers, and run identifiers. No API credentials or temporary signed URLs. |

Placement uses pixels relative to the top-left of the composition canvas. Layer order runs from background to foreground. Each layer declares its own image dimensions and placement, so cropped layers remain unambiguous.

Motion settings describe maximum horizontal and vertical pointer displacement in pixels and a scroll displacement range in pixels. These values are preview metadata; a consumer can ignore them.

The default export includes all layers and preserves visibility flags. It uses downloaded local files rather than depending on expiring provider URLs.

The original approved composition and the reconstructed layer composite can differ. The review interface shows both. Export readiness requires manual review of transparency, alignment, and exposed areas at the maximum configured motion.

No specific integration named “Intraleaf” was identified during source discovery. The bundle is portable; compatibility with that consumer remains unverified until its format is identified.

## Proposed data model

| Record | Responsibility |
| --- | --- |
| Project | Title, workflow inputs, selected style revision, selected outputs, and canvas layout. |
| Style revision | Immutable guidance and reference image IDs for a reusable style. |
| Asset | Local file identity, media type, dimensions, content hash, and origin. |
| Run | Stage, immutable input snapshot, provider request ID, status, timestamps, output asset IDs, and failure details. |
| Approval | Selected composition ID and the exact input revision approved. |
| Layer set | Source composition, generating run, layer assets, placement, order, visibility, and motion settings. |

Run states are queued, running, succeeded, failed, and unknown. Unknown means submission or remote completion cannot yet be established. A failed or unknown run never starts a replacement generation automatically.

An outdated flag describes a result's relationship to current project inputs. It is separate from execution status because a successful result can be outdated.

## Proposed technical approach

The proposed route is `/tools/assets` inside `apps/web`. Workflow-specific components and server operations stay in the app. Shared controls are imported through the public exports of `@personal-site/ui`.

React Flow core is the recommended canvas foundation. It supplies graph interactions while allowing custom React controls. The paid AI workflow template is optional and is not required or approved for purchase.

The initial implementation uses one composition provider and one layer-preparation provider. Provider selection follows a small real-asset evaluation. Multiple provider selectors, a plugin framework, and an agent orchestration platform are not required for v1.

Qwen-Image-Layered through fal is a candidate for layer preparation. Its documented ability to produce RGBA layers does not establish that it reconstructs this artwork accurately enough for motion. The implementation must test that claim on representative assets.

If separation leaves exposed gaps, the next candidate is a targeted reconstruction stage using an image-editing model. That stage must retain the original input and run history. The tool must not silently replace a failed preparation result with an unreviewed image.

Existing Eve integration is a source of potentially reusable behavior, not a requirement to add agent orchestration. Image-generation calls alone do not require an agent.

Local persistence uses an application-owned directory outside public assets and source control. A versioned project document plus asset files is the proposed first storage model. Writes are atomic and serialized per project. No cloud database is required.

Provider calls execute on the server. API keys remain in local server configuration. The browser receives project and run identifiers, not credentials or arbitrary filesystem access.

The local tool and its write endpoints are disabled in the public deployment. Local write requests validate their origin and input schemas. File operations remain within the configured storage directory.

Runtime validation follows the repository's `effect/Schema` convention. Existing lifecycle helpers and Effect owners are reused where they fit. React owns interactive UI state.

## Failure and recovery behavior

- A double-click on Run cannot create two submissions for the same action.
- A missing provider key produces a configuration error before submission.
- A submission with uncertain acceptance is recorded as unknown. It is reconciled by request ID when supported instead of being blindly retried.
- Reloading the page restores projects, output history, selections, and known remote requests. Reloading does not resubmit generation.
- Completed output downloads can be retried without rerunning generation.
- Invalid or incomplete layer output remains in history with an explanation. It cannot be presented as a verified export.
- Navigating away stops UI polling. It does not imply that a remote job was cancelled.
- Failed persistence reports an error and does not present the change as saved.

## Acceptance criteria

1. A project with subject references, a saved style, and a prompt survives an app restart.
2. A manual composition run produces a real provider result and records its inputs. A rerun preserves the first result.
3. Layer generation cannot start before approval. Changing an approved input invalidates approval and marks downstream results outdated.
4. Updating a saved style does not alter existing run snapshots or silently update projects.
5. A completed layer run produces inspectable transparent images with explicit order and placement.
6. Layer names, visibility, order, and motion edits survive reload and appear in the export.
7. The preview supports static and reduced-motion use. Maximum-offset inspection makes gaps visible.
8. An exported bundle reconstructs the saved arrangement without provider access or temporary URLs.
9. Duplicate clicks, reloads, and uncertain submissions do not cause automatic duplicate paid generations.
10. The public app cannot access the local tool's write endpoints or local files. Existing blog rendering remains unchanged.

Verification combines focused tests for approval, revision tracking, persistence, and submission identity with a real browser walkthrough. Provider evaluation uses an existing paper scene and a composition created from references. No real generation or quality evaluation has been performed for this spec.

Implementation verification must follow the owning repository's current checks, including `bun run verify`, and an independent code review. A spec alone does not satisfy those implementation gates.

## Implementation sequence after authorization

1. Evaluate the selected providers on representative images and record layer quality limits. Confirm credentials and provider terms without making them part of the client.
2. Add the local route, persistence, reusable styles, and preconnected workflow using existing assets for preview development.
3. Connect real composition generation, immutable run history, selection, and approval.
4. Connect layer preparation, the inspector, motion preview, and portable export.
5. Verify recovery behavior, local-only access, and the complete workflow. Review the patch before delivery.

The first useful milestone is one saved project that generates an approved composition and exports a reviewed layer bundle. A general workflow platform is outside this milestone.

## Deferred scope

Multiuser access, collaboration, cloud project storage, scheduled runs, automatic paid retries, cost estimates, blog editing, publishing, direct site integration, manual pixel editing, video generation, and arbitrary workflow graphs are outside v1.

## Reference material

- [React Flow AI workflow editor](https://reactflow.dev/ui/templates/ai-workflow-editor) documents an existing editor template. Core graph interactions can be used without purchasing that template.
- [React Flow Pro content](https://reactflow.dev/pro/content) and [template license](https://xyflow.com/pro-license) distinguish paid template access from the core library.
- [Qwen-Image-Layered API](https://fal.ai/models/fal-ai/qwen-image-layered/api) documents image decomposition into RGBA layers.
- [Qwen-Image-Layered source](https://github.com/QwenLM/Qwen-Image-Layered) describes the underlying model.
- [ComfyUI](https://github.com/Comfy-Org/ComfyUI) was considered as an existing workflow application. The confirmed direction is a custom interface in the current app.

The remaining technical proposals are the route name, canvas dependency, local storage layout, provider selection, and precise export schema. They are reviewable defaults in this spec, not authorization to install dependencies, purchase templates, run paid jobs, or implement the tool.
