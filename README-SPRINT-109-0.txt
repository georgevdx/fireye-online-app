Fire-S Sprint 109.0 - Multi-Inspection Core Fix

Purpose
- Fixes the issue where an existing premises opens with previous checklist answers when starting a new inspection.

What changed
- Added Start New Inspection for existing premises.
- Premises / Building Passport information is retained.
- Previous answers, photos, comments and follow-up notes are archived to Inspection History.
- The new inspection receives a fresh inspection number and blank checklist answers.
- Photos and final comments are reset for the new inspection.
- Checklist fields are explicitly cleared before loading any project answers to prevent stale browser UI values.

How to use
1. Open the Projects / Premises list.
2. Click a premises card to open the summary.
3. Click Start New Inspection.
4. Confirm the action.
5. The premises details remain, but the checklist starts blank.

Notes
- This is a safe core fix built on the current project model.
- It does not remove the existing project storage model yet.
- It prepares the app for a future full separation of Premises, Building Passport and Inspection records.
