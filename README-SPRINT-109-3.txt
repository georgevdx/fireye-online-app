Fire-S Sprint 109.3 - Trend Analytics

Integrated into the current Fire-S codebase.

Added:
- sprint-109-3-trends.js
- Trend Analytics panel per premises
- Compliance trend across current and historical inspections
- Open Actions trend
- Average compliance
- Last 5 inspections timeline
- Repeated Action Items detection
- AI-ready trend signals such as compliance improving/declining and repeated issues detected

Integration notes:
- Loaded after Sprint 109.2 comparison module in index.html.
- Uses existing fireyeProjects localStorage/project model.
- Does not change Building Passport, Action Register, or existing inspection data structure.
- Panel appears after Inspection Comparison, or after Inspection History if comparison is not present.

Recommended test:
1. Open an existing premises.
2. Confirm Trend Analytics panel appears.
3. Start a new inspection and save answers.
4. Confirm history + current inspection create trend data.
5. Confirm repeated "No" items appear in Repeated Action Items.
