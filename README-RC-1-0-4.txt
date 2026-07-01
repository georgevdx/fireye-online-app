Fire-S RC 1.0.4 - Workflow Gate No Data Loss

Purpose:
- Fixes RC-001 where opening Workflow Gate options could clear photos/inspection data.
- Continue/Edit preserves existing photos, answers, comments and actions.
- View History runs under a read-only autosave lock and restores the project snapshot after opening.
- Start New Inspection remains the only path that creates a blank inspection, and still requires confirmation.
- Delete remains disabled/locked.

Upload root files:
- index.html
- app.js
- service-worker.js

Test:
1. Open an existing inspection with photos.
2. Choose Continue/Edit and confirm photos still show.
3. Return to list, open same premises, choose View Inspection History.
4. Return and choose Continue/Edit again.
5. Photos must still be present.
