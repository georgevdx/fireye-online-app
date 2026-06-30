FIRE-S Sprint 108.2 - Category Intelligence Dashboard

Purpose
- Extends the Sprint 108.1 Intelligent Risk Engine.
- Adds a Category Intelligence panel to the Executive Dashboard.
- Shows the weakest scored fire-safety categories first.
- Highlights the strongest category and open risk item counts.

Files changed
- risk-engine.js
- styles.css
- index.html script cache version

Notes
- This is a safe add-on patch.
- No Action Register logic was removed.
- No Building Passport data structure was changed.
- Existing compliance score, Building Health and Overall Risk remain active.

How to test
1. Open the app.
2. Select or create a premises with checklist answers.
3. Mark a few checklist items Yes/No.
4. Save/reload.
5. Return to the Executive Dashboard.
6. Confirm that the Category Intelligence panel appears below the Risk Strip.

Expected result
- Overall Compliance updates.
- Building Health updates.
- Overall Risk updates.
- Category Intelligence shows up to four weakest categories.
