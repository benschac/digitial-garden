# Anti-slop provenance

Source: https://github.com/dmmulroy/anti-slop

Exact source commit: `13909c9e07590f5a85d93c62712259fe14a883f7`.

Copied with that revision's `skills/install-anti-slop/scripts/install.mjs` from
`skills/install-anti-slop/assets/anti-slop` into `tools/oxlint/anti-slop`.
The bundled assets match the runtime files under that revision's `src/`; upstream
test files are omitted by the upstream installer. The root MIT license was copied
alongside the plugin. The nested `vendor/eslint-stylistic/LICENSE` and
`vendor/eslint-stylistic/UPSTREAM.md` are retained verbatim.

Runtime rule source is unmodified, including upstream comments. Local additions
are this provenance record, the root license, and a private `package.json` declaring
`type: module` so Node loads the TypeScript plugin without module-detection warnings.
Both generic and Effect entry points are registered in the root Oxlint config.

Project-owned integration tests in `scripts/rule-coverage.test.mjs` exercise generic
and Effect diagnostics through the installed CLI. They do not replace upstream's
complete plugin test suite. When updating, compare against the exact revision above
and preserve local configuration and the nested license/provenance records.
