/*
  Fire-S RC Stability Hotfix v114.0
  Focus: field stability, no stale inspection context, no random Findings jumps,
  safe inspection-only delete, and practical Home Executive Dashboard.
*/
(function () {
  'use strict';

  const SCROLL_KEY_PREFIX = 'fireSScrollPosition:';
  let scrollSaveTimer = null;
  let lastKnownProjectId = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function safeText(value, fallback = '-') {
    const text = value === null || value === undefined ? '' : String(value).trim();
    return text || fallback;
  }

  function escapeHtml(value) {
    return safeText(value, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getProjectsSafe() {
    try {
      if (typeof getProjects === 'function') {
        const projects = getProjects();
        return Array.isArray(projects) ? projects : [];
      }
    } catch (error) {
      console.warn('RC Stability: could not read projects.', error);
    }
    return [];
  }

  function setProjectsSafe(projects) {
    try {
      if (typeof setProjects === 'function') {
        setProjects(projects);
        return true;
      }
    } catch (error) {
      console.error('RC Stability: could not save projects.', error);
    }
    return false;
  }

  function getCurrentProjectIdSafe() {
    try {
      if (typeof currentProjectId !== 'undefined' && currentProjectId) return currentProjectId;
    } catch (error) {
      // ignore
    }
    return lastKnownProjectId || null;
  }

  function setCurrentContext(project) {
    if (!project) return;

    try { currentProjectId = project.id; } catch (error) {}
    try { currentProject = project; } catch (error) {}
    try { currentPhotos = Array.isArray(project.photos) ? project.photos : []; } catch (error) {}

    lastKnownProjectId = project.id;
    updateInspectionCommandHeaderStable(project);
  }

  function getProjectTitle(project) {
    return safeText(
      project?.siteName ||
      project?.projectName ||
      project?.premisesName ||
      project?.organisationName ||
      'Unnamed Premises'
    );
  }

  function getProjectCompany(project) {
    return safeText(
      project?.organisationName ||
      project?.companyName ||
      project?.clientName ||
      'Company'
    );
  }

  function getProjectDate(project) {
    return safeText(
      project?.inspectionDate ||
      project?.completedAt?.slice?.(0, 10) ||
      project?.lastSaved?.slice?.(0, 10) ||
      project?.scheduledDate ||
      ''
    );
  }

  function isProjectCompleted(project) {
    return Boolean(
      project?.completedAt ||
      project?.archivedAt ||
      project?.archiveStatus === 'completed' ||
      project?.scheduledStatus === 'completed'
    );
  }

  function getTodayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function normaliseDate(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
    return parsed.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
    return parsed.toLocaleDateString('en-ZA');
  }

  function getScheduleDate(project) {
    return project?.scheduledDate || project?.followUpDate || '';
  }

  function getScheduleLabel(project) {
    const type = String(project?.scheduleType || project?.scheduledReason || '').toLowerCase();
    if (type.includes('follow')) return 'Follow-up';
    if (type.includes('recurring') || type.includes('cycle')) return 'Cycle';
    if (type.includes('new')) return 'New inspection';
    return 'Scheduled inspection';
  }

  function getVisibleProjectsSafe() {
    const projects = getProjectsSafe();
    try {
      if (typeof getVisibleProjectsForCurrentUser === 'function' && typeof currentUserProfile !== 'undefined' && currentUserProfile) {
        const visible = getVisibleProjectsForCurrentUser(projects);
        return Array.isArray(visible) ? visible : projects;
      }
    } catch (error) {
      // fallback below
    }
    return projects;
  }

  function updateInspectionCommandHeaderStable(forcedProject) {
    const companyEl = byId('inspectionCommandCompany');
    const siteEl = byId('inspectionCommandSite');
    if (!companyEl || !siteEl) return;

    const projectId = getCurrentProjectIdSafe();
    const project = forcedProject || getProjectsSafe().find(item => String(item.id) === String(projectId));

    companyEl.textContent = project ? getProjectCompany(project) : 'Company';
    siteEl.textContent = project ? getProjectTitle(project) : 'Site';

    companyEl.dataset.contextProjectId = project?.id || '';
    siteEl.dataset.contextProjectId = project?.id || '';
  }

  function installCommandHeaderContextLock() {
    window.updateInspectionCommandHeader = updateInspectionCommandHeaderStable;

    setInterval(() => {
      const projectId = getCurrentProjectIdSafe();
      if (!projectId) return;
      const form = byId('projectFormSection');
      if (!form || form.style.display === 'none') return;
      updateInspectionCommandHeaderStable();
    }, 1000);
  }

  function clearInspectionUiBeforeOpen() {
    const companyEl = byId('inspectionCommandCompany');
    const siteEl = byId('inspectionCommandSite');
    if (companyEl) companyEl.textContent = 'Loading...';
    if (siteEl) siteEl.textContent = 'Loading...';

    const saveMessage = byId('saveMessage');
    if (saveMessage) saveMessage.textContent = '';
  }

  function saveScrollPosition() {
    const projectId = getCurrentProjectIdSafe();
    const form = byId('projectFormSection');
    if (!projectId || !form || form.style.display === 'none') return;

    try {
      localStorage.setItem(
        `${SCROLL_KEY_PREFIX}${projectId}`,
        JSON.stringify({ y: window.scrollY || window.pageYOffset || 0, savedAt: Date.now() })
      );
    } catch (error) {
      // ignore storage failure
    }
  }

  function restoreScrollPosition(projectId) {
    if (!projectId) return;

    try {
      const raw = localStorage.getItem(`${SCROLL_KEY_PREFIX}${projectId}`);
      if (!raw) return;

      const saved = JSON.parse(raw);
      if (!saved || typeof saved.y !== 'number') return;
      if (Date.now() - (saved.savedAt || 0) > 1000 * 60 * 60 * 12) return;

      window.scrollTo({ top: Math.max(saved.y, 0), behavior: 'auto' });
    } catch (error) {
      // ignore
    }
  }

  function installScrollMemory() {
    window.addEventListener('scroll', () => {
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(saveScrollPosition, 250);
    }, { passive: true });
  }

  function findChecklistRowByItemIndex(itemIndex) {
    const safeIndex = Number(itemIndex);
    if (!Number.isFinite(safeIndex)) return null;

    return document.querySelector(`.checklist-row[data-item-index="${safeIndex}"]`) ||
      Array.from(document.querySelectorAll('.checklist-row')).find(row => {
        const rowIndex = Number(row.dataset.itemIndex);
        return Number.isFinite(rowIndex) && rowIndex === safeIndex;
      });
  }

  function focusChecklistItemStable(itemIndex) {
    const row = findChecklistRowByItemIndex(itemIndex);
    if (!row) return false;

    const sectionIndex = Number(row.dataset.sectionIndex);

    if (Number.isFinite(sectionIndex)) {
      const rows = Array.from(document.querySelectorAll(`.checklist-row[data-section-index="${sectionIndex}"]`));
      const position = rows.indexOf(row);

      try {
        if (typeof openChecklistSection === 'function') {
          openChecklistSection(sectionIndex, false);
        }

        if (position >= 0 && typeof showChecklistQuestion === 'function') {
          showChecklistQuestion(sectionIndex, position, false);
        }
      } catch (error) {
        console.warn('RC Stability: checklist focus helper failed.', error);
      }
    }

    row.classList.add('issue-focus', 'rc-stable-focus');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      row.classList.remove('issue-focus', 'rc-stable-focus');
    }, 4500);

    return true;
  }

  function installOpenProjectContextWrapper() {
    if (typeof window.openProject !== 'function' || window.openProject.__rcStabilityWrapped) return;

    const originalOpenProject = window.openProject;

    window.openProject = function rcStableOpenProject(projectId, focusMode) {
      saveScrollPosition();
      clearInspectionUiBeforeOpen();

      const result = originalOpenProject.apply(this, arguments);

      const projects = getProjectsSafe();
      const opened = projects.find(project => String(project.id) === String(projectId)) ||
        projects.find(project => String(project.id) === String(getCurrentProjectIdSafe()));

      if (opened) {
        setCurrentContext(opened);
      }

      if (!focusMode) {
        setTimeout(() => restoreScrollPosition(getCurrentProjectIdSafe()), 850);
      }

      setTimeout(() => updateInspectionCommandHeaderStable(), 100);
      setTimeout(() => updateInspectionCommandHeaderStable(), 700);

      return result;
    };

    window.openProject.__rcStabilityWrapped = true;
  }

  function installFindingsNavigationFix() {
    window.openFindingInspection = function rcStableOpenFindingInspection(projectId, itemIndex) {
      saveScrollPosition();

      if (typeof window.openProject === 'function') {
        window.openProject(projectId, '');
      } else {
        return;
      }

      setTimeout(() => {
        const found = focusChecklistItemStable(itemIndex);
        if (!found) {
          const checklistCard = byId('checklistCard');
          if (checklistCard) checklistCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 750);
    };
  }

  function restorePreviousInspectionFromHistory(project) {
    const history = Array.isArray(project.inspectionHistory)
      ? project.inspectionHistory.slice()
      : [];

    if (!history.length) return null;

    const previous = history.pop();

    return {
      ...project,
      ...previous,
      id: project.id,
      companyId: project.companyId,
      companyName: project.companyName,
      createdByUserId: project.createdByUserId,
      createdByEmail: project.createdByEmail,
      inspectionHistory: history,
      deletedAt: null,
      syncPending: true,
      syncError: false,
      lastSaved: new Date().toISOString(),
      restoredFromHistoryAt: new Date().toISOString()
    };
  }

  function clearLatestInspectionButKeepPremises(project) {
    const today = new Date().toISOString().slice(0, 10);

    return {
      ...project,
      inspectionNumber: typeof generateInspectionNumber === 'function'
        ? generateInspectionNumber()
        : project.inspectionNumber || '',
      inspectionDate: today,
      completedAt: null,
      archiveStatus: '',
      archivedAt: null,
      scheduledStatus: 'draft',
      scheduleFreshInspection: false,
      answers: [],
      photos: [],
      finalComments: '',
      followUpRequired: 'No',
      followUpDate: '',
      followUpNotes: '',
      repeatFindings: [],
      followUpFindingMode: false,
      followUpFindingIndexes: [],
      followUpSourceInspectionNumber: '',
      currentInspectionStatus: 'Draft',
      currentInspectionStartedAt: new Date().toISOString(),
      syncPending: true,
      syncError: false,
      lastSaved: new Date().toISOString(),
      latestInspectionDeletedAt: new Date().toISOString()
    };
  }

  async function safeDeleteLatestInspectionOnly() {
    try {
      if (typeof canEditInspection === 'function' && !canEditInspection()) {
        alert('Your company access does not allow deleting inspections.');
        return;
      }
    } catch (error) {
      // if access helper fails, continue with normal confirmation
    }

    const projectId = getCurrentProjectIdSafe();

    if (!projectId) {
      const saveMessage = byId('saveMessage');
      if (saveMessage) saveMessage.textContent = 'Open an inspection first.';
      return;
    }

    const confirmed = confirm(
      'Delete ONLY the latest/current inspection for this premises?\n\n' +
      'The premises, Building Passport and previous inspection history will remain.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    const projects = getProjectsSafe();
    const index = projects.findIndex(project => String(project.id) === String(projectId));

    if (index === -1) {
      alert('Could not find this premises on this device. Sync / refresh may be required.');
      return;
    }

    const existing = projects[index];
    const restored = restorePreviousInspectionFromHistory(existing);
    const updated = restored || clearLatestInspectionButKeepPremises(existing);

    projects[index] = updated;

    if (!setProjectsSafe(projects)) {
      alert('Could not save the inspection delete change.');
      return;
    }

    setCurrentContext(updated);

    try { currentPhotos = Array.isArray(updated.photos) ? updated.photos : []; } catch (error) {}

    if (typeof renderProjectsList === 'function') renderProjectsList();

    if (navigator.onLine && typeof uploadSingleInspection === 'function') {
      uploadSingleInspection(updated).catch(error => {
        console.warn('RC Stability: upload after inspection-only delete failed.', error);
      });
    }

    if (typeof window.openProject === 'function') {
      window.openProject(updated.id, '');
    }

    const saveMessage = byId('saveMessage');
    if (saveMessage) {
      saveMessage.textContent = restored
        ? 'Latest inspection deleted. Previous inspection restored. Premises and Building Passport kept.'
        : 'Latest inspection cleared. Premises and Building Passport kept.';
    }
  }

  function installSafeDeleteInterceptor() {
    document.addEventListener('click', event => {
      const button = event.target && event.target.closest && event.target.closest('#deleteBtn');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      safeDeleteLatestInspectionOnly();
    }, true);
  }

  function hideInactiveModules() {
    // Hide non-working or placeholder modules from the live RC interface.
    ['cmdFindingsBtn', 'cmdReportsBtn', 'analyticsBtn', 'analyticsMenuBtn'].forEach(id => {
      const el = byId(id);
      if (el) el.style.display = 'none';
    });

    const findingsSection = byId('findingsCentreSection');
    if (findingsSection) findingsSection.style.display = 'none';

    const message = byId('mainCommandMessage');
    if (message && /Phase 2|comes next|future/i.test(message.textContent || '')) {
      message.textContent = '';
      message.style.display = 'none';
    }
  }

  function renderHomeOperationalDashboard() {
    const centre = byId('mainCommandCentre');
    if (!centre) return;

    let panel = byId('rcOperationalDashboard');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'rcOperationalDashboard';
      panel.className = 'rc-operational-dashboard';
      const stats = centre.querySelector('.main-command-stats');
      if (stats && stats.parentNode) {
        stats.insertAdjacentElement('afterend', panel);
      } else {
        centre.appendChild(panel);
      }
    }

    const projects = getVisibleProjectsSafe();
    const today = getTodayString();

    const scheduledToday = projects
      .filter(project => normaliseDate(getScheduleDate(project)) === today && !isProjectCompleted(project))
      .sort((a, b) => String(getProjectTitle(a)).localeCompare(String(getProjectTitle(b))))
      .slice(0, 8);

    const recentCompleted = projects
      .filter(isProjectCompleted)
      .sort((a, b) => {
        const aTime = new Date(a.completedAt || a.archivedAt || a.lastSaved || a.inspectionDate || 0).getTime() || 0;
        const bTime = new Date(b.completedAt || b.archivedAt || b.lastSaved || b.inspectionDate || 0).getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const scheduledHtml = scheduledToday.length
      ? scheduledToday.map(project => `
          <button type="button" class="rc-dashboard-row" data-open-project="${escapeHtml(project.id)}">
            <span>
              <strong>${escapeHtml(getProjectTitle(project))}</strong>
              <small>${escapeHtml(getProjectCompany(project))} · ${escapeHtml(getScheduleLabel(project))}</small>
            </span>
            <em>Open</em>
          </button>
        `).join('')
      : '<div class="rc-dashboard-empty">No inspections scheduled for today.</div>';

    const recentHtml = recentCompleted.length
      ? recentCompleted.map(project => `
          <button type="button" class="rc-dashboard-row" data-open-project="${escapeHtml(project.id)}">
            <span>
              <strong>${escapeHtml(getProjectTitle(project))}</strong>
              <small>${escapeHtml(getProjectCompany(project))} · ${escapeHtml(formatDate(project.completedAt || project.archivedAt || project.lastSaved || project.inspectionDate))}</small>
            </span>
            <em>View</em>
          </button>
        `).join('')
      : '<div class="rc-dashboard-empty">No recently completed inspections yet.</div>';

    panel.innerHTML = `
      <div class="rc-dashboard-card rc-dashboard-today">
        <div class="rc-dashboard-heading">
          <span>Scheduled Inspections Today</span>
          <strong>${scheduledToday.length}</strong>
        </div>
        <div class="rc-dashboard-list">${scheduledHtml}</div>
      </div>

      <div class="rc-dashboard-card rc-dashboard-recent">
        <div class="rc-dashboard-heading">
          <span>Last 5 Completed Inspections</span>
          <strong>${recentCompleted.length}</strong>
        </div>
        <div class="rc-dashboard-list">${recentHtml}</div>
      </div>
    `;

    panel.querySelectorAll('[data-open-project]').forEach(button => {
      button.addEventListener('click', () => {
        const projectId = button.getAttribute('data-open-project');
        if (typeof window.openProject === 'function') {
          window.openProject(projectId, '');
        }
      });
    });
  }

  function installHomeDashboardWrapper() {
    if (typeof window.renderHomeCommandCentre === 'function' && !window.renderHomeCommandCentre.__rcStabilityWrapped) {
      const original = window.renderHomeCommandCentre;
      window.renderHomeCommandCentre = function rcStableRenderHomeCommandCentre() {
        const result = original.apply(this, arguments);
        hideInactiveModules();
        renderHomeOperationalDashboard();
        return result;
      };
      window.renderHomeCommandCentre.__rcStabilityWrapped = true;
    }

    hideInactiveModules();
    renderHomeOperationalDashboard();
  }

  function injectStyles() {
    if (byId('rcStabilityStyles')) return;

    const style = document.createElement('style');
    style.id = 'rcStabilityStyles';
    style.textContent = `
      .rc-operational-dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:14px 0;}
      .rc-dashboard-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;box-shadow:0 6px 18px rgba(15,23,42,.06);}
      .rc-dashboard-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;color:#0f172a;font-weight:900;}
      .rc-dashboard-heading span{font-size:.95rem;}
      .rc-dashboard-heading strong{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;border-radius:999px;background:#b71c1c;color:#fff;}
      .rc-dashboard-list{display:grid;gap:8px;}
      .rc-dashboard-row{width:100%;max-width:none;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;border-left:5px solid #b71c1c;border-radius:12px;padding:10px 12px;}
      .rc-dashboard-row:hover,.rc-dashboard-row:focus{background:#fff5f5;border-color:#b71c1c;opacity:1;outline:none;}
      .rc-dashboard-row strong{display:block;font-size:.92rem;color:#111827;}
      .rc-dashboard-row small{display:block;margin-top:3px;color:#64748b;font-weight:700;line-height:1.25;}
      .rc-dashboard-row em{font-style:normal;background:#b71c1c;color:#fff;border-radius:999px;padding:5px 10px;font-size:.75rem;font-weight:900;white-space:nowrap;}
      .rc-dashboard-empty{padding:12px;border-radius:12px;background:#f8fafc;border:1px dashed #cbd5e1;color:#64748b;font-weight:700;}
      .rc-stable-focus{scroll-margin-top:120px;}
      @media(max-width:700px){.rc-operational-dashboard{grid-template-columns:1fr}.rc-dashboard-row{align-items:flex-start}.rc-dashboard-row em{margin-top:2px}}
    `;
    document.head.appendChild(style);
  }

  function initialise() {
    injectStyles();
    installCommandHeaderContextLock();
    installScrollMemory();
    installOpenProjectContextWrapper();
    installFindingsNavigationFix();
    installSafeDeleteInterceptor();
    installHomeDashboardWrapper();

    setTimeout(() => {
      hideInactiveModules();
      renderHomeOperationalDashboard();
      updateInspectionCommandHeaderStable();
    }, 600);
  }

  window.FireSRCStability = {
    renderHomeOperationalDashboard,
    safeDeleteLatestInspectionOnly,
    focusChecklistItemStable,
    updateInspectionCommandHeaderStable
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise);
  } else {
    initialise();
  }
})();
