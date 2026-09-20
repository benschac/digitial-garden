# Homepage design review — 2026-09-20

final result: blocked

## Scope and evidence limits

Requested design-qa; routed to the Product Design audit workflow because no independent source visual exists. This is an implementation audit, not a source-fidelity comparison. The initial review was read-only; the implementation follow-up below records subsequent changes.

- Source visual truth path: unavailable. The earlier screenshots document evolving implementations, not an approved target for the final page.
- Source dimensions: unavailable.
- Implementation: http://127.0.0.1:3000/, current development build.
- Browser: Chrome; the prescribed in-app browser returned “Browser is not available: iab”.
- Theme/state: light, default Tenderness display / Newsreader reading, authenticated state not applicable; development analyst link and font picker visible. Production behavior was not browser-tested.
- Density: devicePixelRatio 1; saved image pixels equal CSS viewport dimensions. No resizing, cropping, or density normalization applied. Captures are JPEG bytes from the browser.
- Saved screenshots were displayed and inspected; the tablet file was independently reopened after saving. File signatures/dimensions were checked.
- Full-view source comparison: unavailable, because the source is missing. Do not treat these captures as a side-by-side comparison.
- Focused source comparison: likewise unavailable. Focused implementation states cover the talk and project below.
- Comparison history: one implementation audit, no fidelity iterations or application fixes. No post-fix claim.

## Findings

### [P2] The product screenshot is too small to explain the project

Location: `.projectImage img`, `apps/web/src/app/home.module.css`.

Evidence: the 403 × 874 product image renders at approximately 177 × 384 CSS px. The app is recognizable, but its interface text is extremely small. The source image also starts mid-content, with a partial preceding item/status area at its top. The tall panel occupies substantial page height without clearly demonstrating the product interaction.

Impact: selected work should help someone understand what Benjamin built; the current image provides weak evidence at its displayed scale.

Fix: replace it with a deliberately captured screen showing one meaningful listing or pickup flow. Give it at least roughly 260–300 CSS px of width where space permits, preserving aspect ratio. Alternatively, use a clearly framed detail crop of a relevant UI region. Avoid simply enlarging this rough capture or hiding context with an arbitrary crop. Keep the existing public image until a replacement is selected.

### [P2, development only] Font controls obscure the page

Location: `.switcher` in `editorial-font-switcher.module.css`.

Evidence: at 390 × 844 the fixed panel covers roughly the bottom 164 px, including the talk artwork or employment content depending on scroll position. At 320 px it similarly masks the first feature. It has no visible collapse control.

Impact: obstructs reviewing the design and reading content in local development. This is not a confirmed production defect: source gates the font picker behind NODE_ENV development.

Fix: collapse the picker behind a compact Typography button, with an explicit close control, or place it in normal document flow. Default to collapsed on small screens.

## Follow-up polish

### [P3] Talk link and imagery repeat too much information

Location: `.talkCopy`, `.featureLink`.

Evidence: the thumbnail already includes the title, conference, and speaker; adjacent text repeats the title and conference. “Watch my App.js Conf 2026 talk” wraps at tablet width while the arrow sits separately at the right.

Fix: use the short visible action “Watch the talk” and keep the arrow beside that label. Longer term, consider an actual stage still without baked-in title text. Current duplication is understandable, not a broken interaction.

### [P3] Selected-work copy describes the app more than the contribution

Location: `.projectCopy`.

Evidence: the paragraph explains listings, offers, and pickups but does not identify a specific engineering decision or outcome.

Fix: when the user selects an accomplishment, replace one sentence with a concrete, verified contribution. No metric or accomplishment should be invented. This is an acknowledged content decision, not a missing implementation requirement.

## Required surface review

- **Fonts/typography:** default Tenderness display and Newsreader reading are active; 48px/45.12px heading at 320px, 128px desktop heading; 20px/28px, weight 550 company headings; serif titles and neutral UI text create a clear hierarchy. The name wraps naturally into two lines at 320px. No clipped text observed. Font optical rendering/antialiasing is browser-dependent and was not compared to a reference. Talk CTA wrapping is the polish finding above.
- **Spacing/layout rhythm:** desktop shared column alignment is coherent; tablet retains a two-column image and side copy; mobile stacks the feature. No document horizontal overflow at 1440, 390, or 320px; tablet visually inspected at 800px. Generous vertical spacing is consistent. The product image proportions and fixed development overlay are the substantive concerns.
- **Colors/tokens:** paper #f8f5ee, ink #211f1b, muted #6f6a61. Calculated contrast on paper: ink 15.11:1, muted 4.93:1. These samples clear normal-text AA contrast; they do not establish comprehensive WCAG conformance. Subtle separators work visually.
- **Images/assets:** both local images loaded. Talk thumbnail is uncropped at its 16:9 ratio, subject correct, usable at captured scale. Project image preserves aspect ratio but is too small and poorly framed for a selected-work detail. No source-art fidelity verdict is possible.
- **Copy/content:** labels are understandable; roles/dates remain scannable; the project paragraph is intentionally general. The talk action is verbose and wraps; repeated title information can be reduced. No new claims were added by this audit.

## Captured steps

The temporary audit screenshots were removed during cleanup; the observations below are retained.

1. **Desktop entry — healthy composition, project imagery needs improvement.** 1440 × 1100 CSS/pixels, DPR 1. Masthead, navigation, talk, and top of work history visible.
2. **Mobile entry — layout healthy, development overlay obstructs it.** 390 × 844 CSS/pixels, DPR 1.
3. **Speaking navigation — works; stacked layout healthy.** Clicked Speaking; fragment navigation lands on the feature. 390 × 844.
4. **Project keyboard focus — works; image readability needs improvement.** Tab from the talk reaches Explore Treasure It, with solid outline and row emphasis. 390 × 844.
5. **Tablet feature — healthy grid, awkward CTA wrap.** 800 × 1000.
6. **Narrow entry — readable two-line name; overlay remains obstructive.** 320 × 740.

## Interaction and accessibility evidence

- Speaking anchor navigation tested successfully.
- Keyboard movement from talk to project CTA tested; visible solid focus outline and focus-within background confirmed.
- Main links measured at least 44 CSS px tall at 390px; social targets measured 44 × 44.
- Both images loaded; accessible text is present. The talk link has a verbose accessible name because alt text and adjacent title repeat the same information.
- No console error entries recorded during this run.
- Reduced-motion guards were inspected in CSS, not tested with an emulated preference in this run.
- External destinations were inspected as hrefs, not navigated; Blog and Playground flows, production build, other browsers, screen-reader announcements, alternate fonts, dark mode, and 200% text zoom were not tested.
- Temporary viewport override reset after capture.

## Open questions

- No independent visual target exists; source-match acceptance remains blocked.
- The user has not yet selected a specific Treasure It accomplishment or replacement screenshot.

## Implementation checklist

1. Capture/select a clean, readable Treasure It screen and size its presentation around the meaningful UI.
2. Make the development typography panel collapsible or put it in document flow.
3. Shorten the talk action and keep its arrow attached to the label.
4. Recheck matching mobile/tablet/desktop states after changes.
5. If formal fidelity QA is needed, supply/approve an independent source visual, then perform combined source/implementation comparisons.

Final result remains blocked for source-fidelity QA: missing source visual. The two P2 implementation findings also remain open. This does not indicate a build failure.


## Implementation follow-up — 2026-09-20

- Fixed the development overlay: Typography starts collapsed. Open and Close controls were tested by pointer and keyboard Enter; closed controls have zero visible selects and aria-expanded=false. Native-select Escape handling was unreliable during testing and was removed; Close typography is the explicit dismissal control.
- Shortened the talk action to “Watch the talk”; tablet capture confirms one-line text with its arrow attached. Removed repetitive thumbnail alt text because the same link already names the talk in adjacent text.
- Improved the existing project screenshot from approximately 177px to 300px wide at the verified 390px and 800px viewports. A dedicated detail grid gives image and description usable widths on tablet. Added a labeled full-size image link, verified opening the existing 403 × 874 asset in a new tab.
- A replacement live-listing capture was attempted but automatic approval review rejected saving it into public assets because it contained a listing location and user-generated details. That capture was not saved or used. The already-published marketing screenshot remains; its imperfect framing is still open.
- Post-fix captures at 390 × 844 and 800 × 1000 (DPR 1) were visually inspected during the review. The temporary images were subsequently removed. No source-fidelity comparison is claimed.
- Mobile/tablet layout and keyboard close were verified. Later viewport requests for 320/1440 reported 800px in the DOM, so they are not counted as fresh breakpoint checks for this follow-up. Viewport overrides were reset.
- Biome passed for page.tsx, home.module.css, editorial-font-switcher.tsx, editorial-font-switcher.module.css. git diff --check passed.
- Status: picker P2 resolved; talk CTA P3 resolved; screenshot readability mitigated, source framing still pending. Contribution copy remains intentionally general.

final result: blocked

Formal source-fidelity acceptance still lacks an independent visual target. The replacement screenshot also remains pending; the working implementation uses the existing asset safely.
