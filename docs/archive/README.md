# Archive

Superseded documents, kept for the reasoning rather than the conclusions. **Nothing here
is current.** If one of these contradicts [../product/roadmap.md](../product/roadmap.md) or
[../product/decisions.md](../product/decisions.md), the current doc wins.

The living parts of these files were extracted before archiving — the landmines into
[../reference/traps.md](../reference/traps.md) and the proven-fine list into
[../reference/do-not-fix.md](../reference/do-not-fix.md).

| File | What it was | Why it is archived |
|------|-------------|--------------------|
| `2026-08-02-launch-review.md` | The original pre-launch review, 19 findings across 4 phases | Says "nothing here is fixed yet". 18 of 19 have since landed. Superseded by the fix brief. |
| `2026-08-02-security-audit.md` | Phase 1 security findings, S1–S5 | All five fixed 2026-08-03. |
| `2026-08-04-fix-brief.md` | The review worklist with fixes and verification per finding | Only P2 (payment rails) remains open, and it is blocked externally. Its two living sections were extracted. **Note: it lists P6 as open — P6 shipped.** |
| `2026-08-04-agent-prompt.md` | Starting prompt for a fresh agent session | Numbers are stale (claims 229 tests; actual is 239) and it describes 3 open findings when 1 remains. Replaced by `AGENTS.md` + [../README.md](../README.md). |
| `2026-08-05-f6-rsc-conversion.md` | Implementation plan for the RSC conversion | Complete and merged (commit `0c6ca98`). All 7 tasks done. |
| `2026-08-06-product-expansion.md` | Market segmentation, feature priority, Meta API map | Partly superseded. Its market research still holds; its competitive premise ("ManyChat is the competitor on price") is stale — the category commoditized at $10-19/mo in early 2026. Its Meta API map is wrong about what Advanced Access blocks. Both corrected in the roadmap. |
| `2026-08-07-roadmap-superseded.md` | First pass at a roadmap, written earlier the same day | Superseded within hours by the reviewed roadmap. Kept because it records the reasoning that led there: it treated Telegram as a late phase and had not yet found the 50-tester cap. |
