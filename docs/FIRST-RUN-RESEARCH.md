# First-Run Quickstart Research

This study recruits 5-10 developers who have not used AI Project Maintainer before. The goal is to learn whether an unfamiliar developer can understand the product, run quickstart, interpret the report, and choose a next action without maintainer coaching.

## Participant Task

1. Spend no more than 30 seconds on the README before running anything.
2. In a public, throwaway, or safely redacted project, run:

   ```bash
   npx ai-project-maintainer quickstart .
   ```

3. Open `reports/quickstart-summary.md`.
4. Explain, in your own words:
   - what the tool found;
   - whether any item is a confirmed vulnerability;
   - what you would do next;
   - what felt confusing, slow, too strict, or untrustworthy.
5. Submit the [redaction-first quickstart feedback form](https://github.com/xixifusi1213-gif/ai-project-maintainer/issues/new?template=quickstart_feedback.yml).

Do not upload private reports, repository names, customer data, production logs, tokens, local paths, or credentials.

## Observation Rules

- Do not explain `FAIL`, `PASS_WITH_GAPS`, `findingKind`, or repair-pack before the participant answers.
- Record the participant's exact words before translating them into a product issue.
- Separate command/runtime failures from report misunderstandings.
- Treat one participant as a low-confidence signal. Promote a theme only after it appears independently at least twice; three or more independent reports is high confidence.
- Do not count maintainers, contributors, or anyone who already knows the command as an unfamiliar participant.

## Research Tracker

| Slot | Date | Project type | Time to report | Result | First friction | First misunderstanding | Feedback link |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |

## Recruitment Copy

> I am looking for 5-10 developers who have never used AI Project Maintainer. Run one command in a public, throwaway, or safely redacted project: `npx ai-project-maintainer quickstart .`. Then tell me what you thought it found, what confused you, and what you would do next. Please do not share private reports or secrets. Feedback form: https://github.com/xixifusi1213-gif/ai-project-maintainer/issues/new?template=quickstart_feedback.yml

## Completion Criteria

The study is complete after 5-10 valid first-run observations. The output should be a short synthesis ranked by frequency and severity, with exact participant wording, product changes, documentation changes, and items that should remain unchanged.
