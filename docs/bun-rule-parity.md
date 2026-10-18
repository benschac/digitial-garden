# Bun and Biome rule coverage

The Bun configuration preserves the available native equivalents of the previous
Biome rules. **It does not provide complete Biome parity.** Bun's native linter
does not analyze CSS or JSON, and some JavaScript checks are unavailable or have
different semantics.

The baseline is the repository's former Biome **2.5.15** configuration:
`linter.rules.preset = "recommended"`, explicit React/Next recommended domains,
and Git ignores. The audit also includes the auto-detected Tailwind/Turborepo
domains. No Jest/Mocha/AVA/Vitest dependency enabled the test domain; the project
and types domains were not enabled. Nursery rules were not enabled.

The audit reads each rule's recommended flag, domains, severity, and source
mapping from the [exact Biome source tag](https://github.com/biomejs/biome/tree/@biomejs/biome@2.5.15),
then checks candidate rules against `bun lint --rules -f json` from the pinned
Bun `1.4.4-canary.1+c0e1716f1`. The [complete coverage manifest](biome-rule-coverage.json)
records all **221** relevant rules, their source paths, mappings, and gaps.

| Previous checks                          | Count | Current coverage                                                               |
| ---------------------------------------- | ----: | ------------------------------------------------------------------------------ |
| JavaScript/TypeScript                    |   191 | 179 mapped to native rules or parser checks, 1 partial mapping, 11 unavailable |
| CSS                                      |    26 | Unavailable in native Bun lint                                                 |
| JSON duplicate object keys               |     1 | Unavailable in native Bun lint                                                 |
| Biome configuration-specific JSON checks |     3 | No longer applicable after removing `biome.json`                               |

There are **179 explicitly enabled native Bun rules**, including the additional
Next checks and the project's stricter assertion policy. Several Biome checks
share a Bun rule. Bun's default rules also remain enabled. No supplemental lint
dependency was installed.

## Severity and options

Mapped checks retain their former severity or a stricter one. Accessibility and
exhaustive-dependency checks are errors again. `no-explicit-any` and
`no-non-null-assertion` remain errors under the repository's assertion policy.
The shared unused-binding rule uses the strongest severity of the Biome checks
it replaces, so unused variables/parameters can now be errors as well as imports.

Options preserve intentional defaults where possible: `== null` remains allowed;
hoisted function declarations and type references remain allowed; unused
parameters are checked, with underscore-prefixed bindings ignored; `noopener`
and `noreferrer` are accepted for new-tab links; and decimal precision and keys
in arrays outside JSX are checked. Equivalent TypeScript rules replace their
base rules to avoid duplicate diagnostics.

The manifest's `source-same` and `source-inspired` labels reflect Biome's source
metadata. They identify related checks, not a guarantee of identical diagnostics,
options, or fixes. `related` identifies a separately reviewed native mapping;
`syntax` identifies an equivalent parser rejection. In particular:

- Bun's use-before-definition rule can report references inside callbacks that
  Biome allows because the callback executes after initialization.
- Bun's semantic-element rule can report `canvas` elements with `role="img"`
  where Biome's diagnostics differ.
- Conditional-assignment checking is partial: `no-cond-assign` cannot reproduce
  every expression position covered by Biome's `noAssignInExpressions`.
- The native new-tab link rule covers anchors and forms; Biome also checks areas.
- Import/type-export grouping and automatic fixes can differ.

## JavaScript checks without a native mapping

- `a11y/noSvgWithoutTitle`
- `complexity/noThisInStatic`
- `complexity/noUselessContinue`
- `complexity/noUselessStringRaw`
- `complexity/useSimpleNumberKeys`
- `correctness/noStringCaseMismatch`
- `correctness/noVoidTypeReturn`
- `performance/noDynamicNamespaceImportAccess`
- `suspicious/noImplicitAnyLet`
- `suspicious/noSuspiciousSemicolonInJsx`
- `suspicious/noUndeclaredEnvVars` (auto-detected Turborepo domain at the root)

TypeScript checks overlap with some missing rules, but they are not counted as
equivalents. Formatting CSS/JSON does not replace linting those languages. Full
coverage requires a supplemental checker or future Bun support.

## Verification

`bun run test:tools` verifies every manifest mapping against Bun's resolved
configuration and checks representative diagnostics, the intentional null
comparison exception, and parser behavior. It also tests the changed-file Stop
hook. Update the manifest, `bunfig.toml`, and these checks together when upgrading
the tooling pin. Repository-wide lint failures are reported without automatically
rewriting application code.
