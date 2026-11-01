# US research coverage checks

Checked 2026-11-01T23:28:22.228Z using international / first-year profiles and the current university directory. This is a discovery audit, not an admission checklist or a certification of completeness. A located topic may be a mention, optional policy, conditional instruction or conflicting evidence. No applicant eligibility is determined.

| University | HTML pages read | Result | Topics without evidence |
|---|---:|---|---|
| Amherst College | 2 | Partial: live waiver policy and separate QuestBridge excerpts; general checklist blocked | Application form, Transcripts, School / college reports, Recommendations, Essays / writing supplement, Testing policy, English-language policy, Translations, Later school updates, Program-specific supplements |
| Bowdoin College | 6 | Document evidence found | None absent from the topic scan; scope and conditions still need review |
| Brown University | 5 | Document evidence found | Translations |
| California Institute of Technology | 10 | Document evidence found | None absent from the topic scan; scope and conditions still need review |
| Dartmouth College | 10 | Document evidence found; some sources failed | Translations |
| Denison University | 4 | Document evidence found | Translations, Later school updates |
| Duke University | 2 | Document evidence found; some sources failed | None absent from the topic scan; scope and conditions still need review |
| Grinnell College | 7 | Document evidence found | None absent from the topic scan; scope and conditions still need review |
| Harvard University | 5 | Document evidence found | Program-specific supplements |
| Princeton University | 7 | Document evidence found; some sources failed | None absent from the topic scan; scope and conditions still need review |
| Rice University | 4 | Document evidence found | None absent from the topic scan; scope and conditions still need review |
| Stanford University | 10 | Document evidence found | None absent from the topic scan; scope and conditions still need review |
| University of Notre Dame | 6 | Document evidence found | Translations, Later school updates, Program-specific supplements |
| University of Richmond | 10 | Document evidence found | None absent from the topic scan; scope and conditions still need review |
| Washington and Lee University | 10 | Document evidence found | Translations |
| Williams College | 0 | Blocked; manual source review needed | Application form, Transcripts, School / college reports, Recommendations, Essays / writing supplement, Testing policy, English-language policy, Translations, Later school updates, Program-specific supplements |
| Yale University | 10 | Document evidence found | Program-specific supplements |
| Massachusetts Institute of Technology | 10 | Document evidence found | Translations |

Amherst’s main source returns HTTP 405; the automatic alternatives both loaded. Williams returns HTTP 403 and remains unverified. Dartmouth’s outside-US testing page and one Princeton international-center page also returned HTTP 403. Duke’s private application-status page was unavailable; its public requirements remained readable. Access may differ on the deployed host and can change.

Richmond now uses its redirected canonical admission.richmond.edu address. Washington and Lee and Bowdoin emit legacy HTTP redirect headers; the reader follows only their HTTPS equivalents and retains all robots and certificate checks.

Repeat without reading or modifying saved applications:

```sh
node scripts/check-research-coverage.mjs > coverage.json
```

The script checks three universities concurrently, with the normal per-university 10-page / 14-attempt / 24-second limits. It reports missing topics, mixed/mention evidence, failures and pathway counts. The website presents those warnings for each lookup. Fees, waiver eligibility, all rounds, program-specific requirements and the final applicant portal need their own review.
