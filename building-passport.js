
/* Fire-S Building Passport Foundation v104.0 */

(function () {
  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getCurrentPremises() {
    if (typeof currentProjectId === 'undefined' || !currentProjectId) return null;
    if (typeof getProjects !== 'function') return null;
    return getProjects().find(project => project.id === currentProjectId) || null;
  }

  function normalDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toISOString().slice(0, 10);
  }

  function displayDate(value) {
    const key = normalDate(value);
    if (!key) return 'Not set';
    const date = new Date(key + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString();
  }

  function premisesName(project) {
    return (
      project?.projectName ||
      [project?.organisationName, project?.siteName].filter(Boolean).join(' - ') ||
      project?.siteName ||
      'Untitled Premises'
    );
  }

  function premisesAddress(project) {
    return (
      project?.projectAddress ||
      [project?.streetNumber, project?.addressLine].filter(Boolean).join(' ') ||
      project?.addressLine ||
      'No address captured'
    );
  }

  function actionStats(project) {
    const actions = Array.isArray(project?.actions) ? project.actions : [];
    const open = actions.filter(action => String(action.status || '').toLowerCase() !== 'closed');

    return {
      total: actions.length,
      open: open.length,
      critical: open.filter(action => action.priority === 'Critical').length,
      high: open.filter(action => action.priority === 'High').length,
      closed: actions.length - open.length
    };
  }

  function noAnswerCount(project) {
    return (project?.answers || []).filter(answer =>
      String(answer?.answer || '').trim().toLowerCase() === 'no'
    ).length;
  }

  function answeredCount(project) {
    return (project?.answers || []).filter(answer =>
      String(answer?.answer || '').trim()
    ).length;
  }

  function complianceScore(project) {
    const answers = project?.answers || [];
    const total = answers.filter(answer => String(answer?.answer || '').trim()).length;
    const no = noAnswerCount(project);

    if (!total) return 0;

    return Math.max(0, Math.round(((total - no) / total) * 100));
  }

  function lastInspectionDate(project) {
    const dates = [
      project?.completedAt,
      project?.inspectionDate,
      project?.lastSaved,
      ...(project?.inspectionHistory || []).map(item =>
        item?.completedAt || item?.inspectionDate || item?.archivedAt || ''
      )
    ]
      .map(normalDate)
      .filter(Boolean)
      .sort();

    return dates.length ? dates[dates.length - 1] : '';
  }

  function nextInspectionDate(project) {
    if (!project) return '';
    if (project.scheduledDate) return project.scheduledDate;
    if (project.followUpDate) return project.followUpDate;

    if (
      project.recurringCycleEnabled === true &&
      typeof getNextRecurringCycleDate === 'function'
    ) {
      return getNextRecurringCycleDate(project);
    }

    return '';
  }

  function historyCount(project) {
    return Array.isArray(project?.inspectionHistory)
      ? project.inspectionHistory.length
      : 0;
  }

  function photoCount(project) {
    const current = Array.isArray(project?.photos) ? project.photos.length : 0;
    const history = (project?.inspectionHistory || []).reduce(
      (sum, item) => sum + ((item?.photos || []).length),
      0
    );

    return current + history;
  }

  function summaryText(project) {
    const actions = actionStats(project);
    const score = complianceScore(project);
    const last = lastInspectionDate(project);
    const next = nextInspectionDate(project);
    const findings = noAnswerCount(project);

    const lines = [];

    if (last) {
      lines.push(`Last inspection recorded on ${displayDate(last)}.`);
    } else {
      lines.push('No completed inspection date has been recorded yet.');
    }

    if (score) {
      lines.push(`Current compliance score is ${score}%.`);
    }

    if (actions.open > 0) {
      lines.push(`${actions.open} action${actions.open === 1 ? '' : 's'} remain open, including ${actions.critical} critical and ${actions.high} high priority item${actions.high === 1 ? '' : 's'}.`);
    } else if (findings > 0) {
      lines.push(`${findings} finding${findings === 1 ? '' : 's'} have been identified from checklist answers.`);
    } else {
      lines.push('No open action items are currently recorded.');
    }

    if (next) {
      lines.push(`Next inspection or follow-up is scheduled for ${displayDate(next)}.`);
    }

    return lines;
  }

  function sectionHealth(project) {
    const rows = [];
    const answers = project?.answers || [];

    const groups = new Map();

    answers.forEach(answer => {
      const name = answer.sectionName || answer.category || 'Inspection';
      if (!groups.has(name)) groups.set(name, { total: 0, no: 0 });
      const group = groups.get(name);
      if (String(answer.answer || '').trim()) group.total += 1;
      if (String(answer.answer || '').trim().toLowerCase() === 'no') group.no += 1;
    });

    if (groups.size === 0 && typeof getActiveTemplateChecklist === 'function') {
      const checklist = getActiveTemplateChecklist() || [];
      checklist.slice(0, 5).forEach(item => {
        const name = item.sectionName || item._sectionName || 'Inspection';
        if (!groups.has(name)) groups.set(name, { total: 0, no: 0 });
      });
    }

    groups.forEach((value, key) => {
      const score = value.total ? Math.max(0, Math.round(((value.total - value.no) / value.total) * 100)) : 0;
      rows.push({ name: key, score, total: value.total, no: value.no });
    });

    return rows.slice(0, 6);
  }

  function render(project) {
    const score = complianceScore(project);
    const actions = actionStats(project);
    const health = sectionHealth(project);

    return `
      <section class="fire-s-building-passport-v104">
        <div class="fire-s-passport-hero-v104">
          <div>
            <span>Building Passport</span>
            <h2>${esc(premisesName(project))}</h2>
            <p>${esc(premisesAddress(project))}</p>
          </div>
          <div class="fire-s-passport-score-v104">
            <small>Compliance</small>
            <strong>${score || 0}%</strong>
          </div>
        </div>

        <div class="fire-s-passport-tabs-v104">
          <button type="button" class="active">Overview</button>
          <button type="button" data-scroll-target="fireSActionRegisterPanelV1033">Actions</button>
          <button type="button" data-scroll-target="checklist">Inspection</button>
          <button type="button" data-scroll-target="photoPreview">Photos</button>
          <button type="button" data-scroll-target="reportSection">Reports</button>
        </div>

        <div class="fire-s-passport-grid-v104">
          <div><span>Last Inspection</span><strong>${esc(displayDate(lastInspectionDate(project)))}</strong></div>
          <div><span>Next Inspection</span><strong>${esc(displayDate(nextInspectionDate(project)))}</strong></div>
          <div><span>Open Actions</span><strong>${actions.open}</strong></div>
          <div><span>Critical / High</span><strong>${actions.critical} / ${actions.high}</strong></div>
          <div><span>Findings</span><strong>${noAnswerCount(project)}</strong></div>
          <div><span>Photos</span><strong>${photoCount(project)}</strong></div>
          <div><span>History</span><strong>${historyCount(project)}</strong></div>
          <div><span>Answered</span><strong>${answeredCount(project)}</strong></div>
        </div>

        <div class="fire-s-passport-summary-v104">
          <h3>Premises Summary</h3>
          <ul>
            ${summaryText(project).map(line => `<li>${esc(line)}</li>`).join('')}
          </ul>
        </div>

        <div class="fire-s-passport-health-v104">
          <h3>Building Health</h3>
          ${
            health.length
              ? health.map(item => `
                <div class="fire-s-health-row-v104">
                  <div>
                    <strong>${esc(item.name)}</strong>
                    <span>${item.no} finding${item.no === 1 ? '' : 's'} / ${item.total || 0} answered</span>
                  </div>
                  <div class="fire-s-health-bar-v104">
                    <i style="width:${item.score}%"></i>
                  </div>
                  <b>${item.score}%</b>
                </div>
              `).join('')
              : '<p class="fire-s-passport-muted-v104">Health will populate as checklist answers are captured.</p>'
          }
        </div>
      </section>
    `;
  }

  function inject() {
    const form = document.getElementById('projectFormSection');
    if (!form || form.style.display === 'none') return;

    const project = getCurrentPremises();
    if (!project) return;

    let existing = document.getElementById('fireSBuildingPassportV104Wrapper');

    if (!existing) {
      const workspace =
        document.getElementById('fireSPremisesWorkspaceLiteV101') ||
        form.querySelector('.toolbar') ||
        form.firstElementChild;

      const wrapper = document.createElement('div');
      wrapper.id = 'fireSBuildingPassportV104Wrapper';

      if (workspace && workspace.parentElement) {
        workspace.insertAdjacentElement('afterend', wrapper);
      } else {
        form.insertAdjacentElement('afterbegin', wrapper);
      }

      existing = wrapper;
    }

    existing.innerHTML = render(project);

    existing
      .querySelectorAll('[data-scroll-target]')
      .forEach(button => {
        button.addEventListener('click', () => {
          const target =
            document.getElementById(button.dataset.scrollTarget);

          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
  }

  window.FireSBuildingPassport = {
    inject,
    render
  };

  setTimeout(inject, 800);
  setInterval(inject, 2500);
})();
