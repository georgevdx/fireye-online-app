let currentFilter = 'all';
function setFilter(filter) {
  currentFilter = filter;
  renderProjectsList();
}
let occupancies = [];
let requirements = [];
let checklists = [];
let inspectionTemplates = {};
let currentProjectId = null;
let currentPhotos = [];

const SUPABASE_URL = "https://ispsdmglyylcwkufphnv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzcHNkbWdseXlsY3drdWZwaG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzkwNDUsImV4cCI6MjA5MTc1NTA0NX0.Uy_DcmodOBvZf_WMOtnZwAh4ZQeJIbS9ojBw8DzNXhk";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function buildStreetAddress(address = {}) {

  const streetNumber =
    address.house_number ||
    address.building_number ||
    '';

  const streetName =
    address.road ||
    address.street ||
    address.pedestrian ||
    address.footway ||
    '';

  const suburb =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.quarter ||
    '';

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    '';

  const province =
    address.state ||
    '';

  return [
    [streetNumber, streetName].filter(Boolean).join(' '),
    suburb,
    city,
    province
  ]
    .filter(Boolean)
    .join(', ');
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed to load: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function getEl(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing HTML element with id="${id}"`);
  }
  return el;
}

let autoSaveTimer = null;

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);

  autoSaveTimer = setTimeout(() => {
    autoSaveProject();
  }, 800);
}

function autoSaveProject() {
  const projectNameField = document.getElementById('projectName');
  const inspectorNameField = document.getElementById('inspectorName');
  const occupancyField = document.getElementById('occupancySelect');
  const projectAddressField = document.getElementById('projectAddress');
  const gpsField = document.getElementById('gps');
  const inMallField = document.getElementById('inMall');
  const mallNameField = document.getElementById('mallName');
  const unitNumberField = document.getElementById('unitNumber');
  const contactPerson = getEl('contactPerson').value.trim();
  const contactTel = getEl('contactTel').value.trim();
  const contactEmail = getEl('contactEmail').value.trim();
  const organisationName = getEl('organisationName').value.trim();
  const siteName = getEl('siteName').value.trim();

if (!projectNameField || !projectAddressField|| !gpsField|| !inMallField || !mallNameField || !unitNumberField || !inspectorNameField || !occupancyField) return;

  const projectName = projectNameField.value.trim();
  const inspectorName = inspectorNameField.value.trim();
  const occupancy = occupancyField.value;
  const projectAddress = projectAddressField.value.trim();
  const gps = gpsField.value.trim();

  const inMall = inMallField.value;
  const mallName = mallNameField.value.trim();
  const unitNumber = unitNumberField.value.trim();
  
  if (!projectName && !inspectorName) return;

  const answers = [];
  document.querySelectorAll('.answer-select').forEach((field, index) => {
    const noteField = document.getElementById(`note_${index}`);

    answers.push({
      itemIndex: index,
      answer: field.value,
      note: noteField ? noteField.value.trim() : ''
    });
  });

  const projects = getProjects();

  if (currentProjectId) {
  const index = projects.findIndex(p => p.id === currentProjectId);
  if (index !== -1) {
    projects[index] = {
      ...projects[index],

      syncPending: true,
      syncError: false,

      projectName,
      organisationName,
      siteName,
      projectAddress,
      gps,
      inMall,
      mallName,
      unitNumber,
      contactPerson,
      contactTel,
      contactEmail,
      inspectorName,
      occupancy,
      answers,
      followUpRequired: getEl('followUpRequired').value,
      followUpDate: getEl('followUpDate').value,
      followUpNotes: getEl('followUpNotes').value.trim(),
      photos: currentPhotos,      
      lastSaved: new Date().toISOString()
    };
  }
} else {
    const newProject = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      
      syncPending: true,
      syncError: false,

      projectName,
      organisationName,
      siteName,
      projectAddress: [
        getEl('streetNumber').value.trim(),
        getEl('projectAddress').value.trim()
      ].filter(Boolean).join(' '),
      gps,
      inMall,
      mallName,
      unitNumber,
      contactPerson,
      contactTel,
      contactEmail,
      inspectorName,
      occupancy,
      answers,

      followUpRequired: getEl('followUpRequired').value,
      followUpDate: getEl('followUpDate').value,
      followUpNotes: getEl('followUpNotes').value.trim(),

      photos: currentPhotos,
      lastSaved: new Date().toISOString()
    };

    currentProjectId = newProject.id;
    projects.push(newProject);
  }

  setProjects(projects);
  renderProjectsList();
  

 const saveMessage = document.getElementById('saveMessage');
  if (saveMessage) {
    saveMessage.textContent = `Last saved: ${formatLastSaved()}`;
  }
  const savedProject = projects.find(p => p.id === currentProjectId);
  uploadSingleInspection(savedProject);
}

  function formatLastSaved(date = new Date()) {
    return date.toLocaleString();
}

  function exportReport() {
  generateReport(); // maak seker report is nuut

  const element = document.getElementById('reportContent');

  const projectName = getEl('projectName').value.trim() || 'Inspection';

  const opt = {
  margin: [15, 12, 15, 12],

  filename: `Fireye_Report_${projectName}.pdf`,

  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: {
  scale: 1,
  useCORS: true,
  scrollY: 0,
  windowWidth: document.getElementById('reportContent').scrollWidth
  },
  jsPDF: {
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  },
  pagebreak: {
    mode: ['avoid-all', 'css', 'legacy']
  }
};

  html2pdf().set(opt).from(element).save();
}

  async function useCurrentLocation() {
  if (!navigator.geolocation) {
    getEl('saveMessage').textContent = 'Geolocation not supported.';
    return;
  }

  getEl('saveMessage').textContent = 'Getting location...';

  navigator.geolocation.getCurrentPosition(
  position => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const gpsText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    getEl('gps').value = gpsText;
    
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
      .then(res => res.json())
      .then(data => {

     
        console.log("FULL DATA:", data);
        console.log("ADDRESS:", data.address);
        console.log("DISPLAY NAME:", data.display_name);

        const streetAddress = buildStreetAddress(data.address || {});

        document.getElementById("projectAddress").value =
          streetAddress || data.display_name || `${lat}, ${lon}`;

        // 👇 BELANGRIK: reset jou status
        getEl('saveMessage').textContent = 'Location captured';

      })
      .catch(err => {
        console.error("Address fetch failed:", err);

        document.getElementById("projectAddress").value = `${lat}, ${lon}`;

        // 👇 reset status selfs as dit fail
        getEl('saveMessage').textContent = 'Location captured (no address)';
      });
  },
  error => {
    console.error("GPS failed:", error);

    getEl('saveMessage').textContent = 'Location failed';
  }
);
}

function toggleMallFields() {
  const inMall = getEl('inMall').value;
  const mallFields = getEl('mallFields');

  if (inMall === 'Yes') {
    mallFields.style.display = 'block';
  } else {
    mallFields.style.display = 'none';
  }
}

function toggleChecklistSection(sectionId) {
  const section = document.getElementById(sectionId);

  if (!section) return;

  if (section.style.display === 'none') {
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
  }
}

function exportBackup() {
  const projects = getProjects();

  const backup = {
    app: 'Fireye',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `fireye-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);

  const saveMessage = document.getElementById('saveMessage');
  if (saveMessage) {
    saveMessage.textContent = 'Backup exported.';
  }
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);

      if (!backup.projects || !Array.isArray(backup.projects)) {
        alert('Invalid backup file.');
        return;
      }

      const confirmed = confirm(
        'Importing this backup will replace the current saved inspections. Continue?'
      );

      if (!confirmed) return;

      setProjects(backup.projects);
      currentProjectId = null;
      currentPhotos = [];

      renderProjectsList();
      showProjectList();

      const saveMessage = document.getElementById('saveMessage');
      if (saveMessage) {
        saveMessage.textContent = 'Backup imported successfully.';
      }
    } catch (error) {
      console.error('Backup import failed:', error);
      alert('Could not import backup file.');
    }

    event.target.value = '';
  };

  reader.readAsText(file);
}

async function signupUser() {
  const email = getEl('loginEmail').value.trim();
  const password = getEl('loginPassword').value;

  const { error } = await supabaseClient.auth.signUp({ email, password });

  getEl('syncStatus').textContent = error
    ? `Sign up failed: ${error.message}`
    : 'Sign up successful. Check email if confirmation is enabled.';
}

async function loginUser() {
  const email = getEl('loginEmail').value.trim();
  const password = getEl('loginPassword').value;

  const syncStatus = document.getElementById('syncStatus');

  if (syncStatus) {
    syncStatus.textContent = 'Logging in...';
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(`Login failed: ${error.message}`);
    if (syncStatus) syncStatus.textContent = `Login failed: ${error.message}`;
    return;
  }

  if (syncStatus) {
    syncStatus.textContent = 'Logged in successfully.';
  }

  updateSyncUI();
  safeDownloadNewerCloudInspections();
  uploadPendingInspections();
}

  async function uploadSync() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
      getEl('syncStatus').textContent = 'Please login before syncing.';
      return;
    }

    const projects = getProjects();

    const rows = projects.map(project => ({
      id: project.id,
      user_id: userData.user.id,
      inspection_data: project,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabaseClient
      .from('inspections')
      .upsert(rows, { onConflict: 'id' });

    getEl('syncStatus').textContent = error
      ? `Sync failed: ${error.message}`
      : `Synced ${rows.length} inspection(s) to cloud.`;
}

async function downloadSync() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    getEl('syncStatus').textContent = 'Please login before downloading sync.';
    return;
  }

  const confirmed = confirm(
    'Download Sync will replace the inspections currently saved on this device. Continue?'
  );

  if (!confirmed) return;

  const { data, error } = await supabaseClient
  .from('inspections')
  .select('inspection_data, updated_at')
  .eq('user_id', userData.user.id)
  .order('updated_at', { ascending: false });

  if (error) {
    getEl('syncStatus').textContent = `Download failed: ${error.message}`;
    return;
  }

  const projects = data.map(row => row.inspection_data);

  setProjects(projects);
  currentProjectId = null;
  currentPhotos = [];

  renderProjectsList();
  showProjectList();

  getEl('syncStatus').textContent = `Downloaded ${projects.length} inspection(s) from cloud.`;
}

async function mergeSync() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    getEl('syncStatus').textContent = 'Please login before merge sync.';
    return;
  }

  const localProjects = getProjects();

  const { data, error } = await supabaseClient
    .from('inspections')
    .select('inspection_data, updated_at')
    .eq('user_id', userData.user.id);

  if (error) {
    getEl('syncStatus').textContent = `Merge failed: ${error.message}`;
    return;
  }

  const cloudProjects = data.map(row => row.inspection_data);

  const mergedMap = new Map();

  localProjects.forEach(project => {
    mergedMap.set(project.id, project);
  });

  cloudProjects.forEach(cloudProject => {
    const localProject = mergedMap.get(cloudProject.id);

    if (!localProject) {
      mergedMap.set(cloudProject.id, cloudProject);
      return;
    }

    const localTime = localProject.lastSaved
      ? new Date(localProject.lastSaved).getTime()
      : 0;

    const cloudTime = cloudProject.lastSaved
      ? new Date(cloudProject.lastSaved).getTime()
      : 0;

    if (cloudTime > localTime) {
      mergedMap.set(cloudProject.id, cloudProject);
    }
  });

  const mergedProjects = Array.from(mergedMap.values());

  setProjects(mergedProjects);
  renderProjectsList();
  showProjectList();

  const rows = mergedProjects.map(project => ({
    id: project.id,
    user_id: userData.user.id,
    inspection_data: project,
    updated_at: new Date().toISOString()
  }));

  const { error: uploadError } = await supabaseClient
    .from('inspections')
    .upsert(rows, { onConflict: 'id' });

  if (uploadError) {
    getEl('syncStatus').textContent = `Merged locally, but upload failed: ${uploadError.message}`;
    return;
  }

  getEl('syncStatus').textContent = `Merge complete. ${mergedProjects.length} inspection(s) synced.`;
}

async function autoSyncIfLoggedIn() {
  if (!navigator.onLine) return;
  if (typeof supabaseClient === 'undefined') return;

  const syncStatus = document.getElementById('syncStatus');

  try {
    const { data: userData, error } = await supabaseClient.auth.getUser();

    if (error || !userData || !userData.user) {
      return;
    }

    if (syncStatus) syncStatus.textContent = 'Auto syncing...';

    await mergeSync();

    if (syncStatus) syncStatus.textContent = 'Auto sync complete.';
  } catch (err) {
    console.error('Auto sync failed:', err);
    if (syncStatus) syncStatus.textContent = 'Auto sync failed.';
  }
}

async function autoMergeAfterSave() {
  if (window.mergeInProgress) return;
  if (!navigator.onLine) return;
  if (typeof supabaseClient === 'undefined') return;

  window.mergeInProgress = true;

  try {
    const { data: userData } = await supabaseClient.auth.getUser();

    if (!userData || !userData.user) {
      return;
    }

    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) syncStatus.textContent = 'Saving to cloud...';

    await mergeSync();

    if (syncStatus) syncStatus.textContent = 'Saved and synced to cloud.';
  } catch (error) {
    console.error('Auto merge after save failed:', error);

    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) syncStatus.textContent = 'Saved locally. Cloud sync failed.';
  } finally {
    window.mergeInProgress = false;
  }
}

async function updateSyncUI() {
  const connectedView = document.getElementById('cloudConnectedView');
  const syncTools = document.getElementById('syncTools');
  const backupTools = document.getElementById('backupTools');
  const syncStatus = document.getElementById('syncStatus');

  const { data } = await supabaseClient.auth.getUser();
  const isLoggedIn = !!(data && data.user);

  if (connectedView) connectedView.style.display = isLoggedIn ? 'block' : 'none';
  if (syncTools) syncTools.style.display = isLoggedIn ? 'none' : 'block';

  // hide backup/import/export for normal view
  if (backupTools) backupTools.style.display = isLoggedIn ? 'none' : 'grid';

  if (syncStatus) {
    syncStatus.textContent = isLoggedIn
      ? 'Connected. Auto sync enabled.'
      : 'Not connected. Admin login required for cloud sync.';
  }
}

function showSyncTools() {
  const syncTools = document.getElementById('syncTools');
  const backupTools = document.getElementById('backupTools');

  if (syncTools) syncTools.style.display = 'block';
  if (backupTools) backupTools.style.display = 'grid';
}

async function safeDownloadNewerCloudInspections() {
  if (!navigator.onLine) return;
  if (typeof supabaseClient === 'undefined') return;

  const syncStatus = document.getElementById('syncStatus');

  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !userData || !userData.user) {
      return;
    }

    const { data, error } = await supabaseClient
      .from('inspections')
      .select('inspection_data, updated_at')
      .eq('user_id', userData.user.id);

    if (error) {
      console.error('Safe download failed:', error);
      if (syncStatus) syncStatus.textContent = `Cloud download failed: ${error.message}`;
      return;
    }

    const localProjects = getProjects();
    const mergedMap = new Map();

    localProjects.forEach(project => {
      mergedMap.set(project.id, project);
    });

    data.forEach(row => {
      const cloudProject = row.inspection_data;
      const localProject = mergedMap.get(cloudProject.id);

      if (!localProject) {
        mergedMap.set(cloudProject.id, cloudProject);
        return;
      }

      const localTime = localProject.lastSaved
        ? new Date(localProject.lastSaved).getTime()
        : 0;

      const cloudTime = cloudProject.lastSaved
        ? new Date(cloudProject.lastSaved).getTime()
        : 0;

      if (cloudTime > localTime) {
        mergedMap.set(cloudProject.id, cloudProject);
      }
    });

    const mergedProjects = Array.from(mergedMap.values());

    setProjects(mergedProjects);
    renderProjectsList();

    if (syncStatus) {
      syncStatus.textContent = 'Cloud download check complete.';
    }
  } catch (err) {
    console.error('Safe download failed:', err);
    if (syncStatus) syncStatus.textContent = 'Cloud download failed.';
  }
}

async function loadData() {
  try {
    occupancies = await loadJson('occupancies.json');
    requirements = await loadJson('requirements.json');
    checklists = await loadJson('checklists.json');
    inspectionTemplates = await loadJson('templates.json');
    
    initApp();
    renderProjectsList();
    updateSyncUI();
    safeDownloadNewerCloudInspections();
    uploadPendingInspections();

  } catch (error) {
    console.error('Data loading error:', error);
    document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>App data failed to load</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}



function initApp() {
  const showSyncToolsBtn = document.getElementById('showSyncToolsBtn');
  if (showSyncToolsBtn) {
    showSyncToolsBtn.addEventListener('click', showSyncTools);
  }
  populateOccupancies();
  getEl('syncMergeBtn').addEventListener('click', mergeSync);
  getEl('syncDownloadBtn').addEventListener('click', downloadSync);
  getEl('loginBtn').addEventListener('click', loginUser);
  getEl('signupBtn').addEventListener('click', signupUser);
  getEl('syncUploadBtn').addEventListener('click', uploadSync);
  getEl('occupancySelect').addEventListener('change', updateDisplay);
  getEl('saveBtn').addEventListener('click', saveProject);
  getEl('reportBtn').addEventListener('click', generateReport);
  getEl('deleteBtn').addEventListener('click', deleteProject);
  getEl('newProjectBtn').addEventListener('click', createNewProject);
  getEl('backBtn').addEventListener('click', showProjectList);
  getEl('photoInput').addEventListener('change', handlePhotoUpload);
  getEl('projectName').addEventListener('input', scheduleAutoSave);
  getEl('inspectorName').addEventListener('input', scheduleAutoSave);
  getEl('occupancySelect').addEventListener('change', scheduleAutoSave);
  getEl('exportBtn').addEventListener('click', exportReport);
  getEl('shareBtn').addEventListener('click', shareReport);
  getEl('followUpBtn').addEventListener('click', createFollowUpInspection);
  getEl('projectAddress').addEventListener('input', scheduleAutoSave);
  getEl('gps').addEventListener('input', scheduleAutoSave);
  getEl('useLocationBtn').addEventListener('click', useCurrentLocation);
  getEl('inMall').addEventListener('change', toggleMallFields);
  getEl('mallName').addEventListener('input', scheduleAutoSave);
  getEl('unitNumber').addEventListener('input', scheduleAutoSave);
  getEl('followUpRequired').addEventListener('change', scheduleAutoSave);
  getEl('followUpDate').addEventListener('input', scheduleAutoSave);
  getEl('followUpNotes').addEventListener('input', scheduleAutoSave);
  getEl('projectSearch').addEventListener('input', renderProjectsList);
  getEl('productType').addEventListener('change', () => {
    updateInspectionTypeOptions();
    updateDisplay();
    scheduleAutoSave();
  });
  getEl('exportBackupBtn').addEventListener('click', exportBackup);
  getEl('importBackupInput').addEventListener('change', importBackup);
  getEl('inspectionType').addEventListener('change', () => {
    updateDisplay();
    scheduleAutoSave();
  });
    updateInspectionTypeOptions();
    toggleMallFields();
  }

function populateOccupancies() {
  const select = getEl('occupancySelect');
  select.innerHTML = "";

  occupancies.forEach(o => {
    const option = document.createElement('option');
    option.value = o["Occupancy Code"];
    option.textContent = `${o["Occupancy Code"]} - ${o["Occupancy Name"]}`;
    select.appendChild(option);
  });
}

function getProjects() {
  const saved = localStorage.getItem('fireyeProjects');
  return saved ? JSON.parse(saved) : [];
}

function setProjects(projects) {
  localStorage.setItem('fireyeProjects', JSON.stringify(projects));
}

function createNewProject() {
  currentProjectId = null;
  getEl('projectName').value = '';
  getEl('productType').value = 'Fire Safety Officer';
  updateInspectionTypeOptions();
  getEl('organisationName').value = '';
  getEl('siteName').value = '';
  getEl('inspectionType').value = 'General Fire Inspection';
  getEl('inspectorName').value = '';
  getEl('occupancySelect').selectedIndex = 0;
  getEl('saveMessage').textContent = '';
  getEl('projectAddress').value = '';
  getEl('gps').value = '';
  getEl('inMall').value = 'No';
  getEl('mallName').value = '';
  getEl('unitNumber').value = '';
  getEl('contactPerson').value = '';
  getEl('contactTel').value = '';
  getEl('contactEmail').value = '';  
  getEl('followUpRequired').value = 'No';
  getEl('followUpDate').value = '';
  getEl('followUpNotes').value = '';
  toggleMallFields();


  currentPhotos = [];
  renderPhotos();

  const reportSection = document.getElementById('reportSection');
  if (reportSection) {
    reportSection.style.display = 'none';
  }

  const reportContent = document.getElementById('reportContent');
  if (reportContent) {
    reportContent.innerHTML = '';
  }

  updateDisplay();
  showProjectForm();
}

function showProjectList() {
  const reportSection = document.getElementById('reportSection');
  if (reportSection) {
    reportSection.style.display = 'none';
  }

  getEl('projectListSection').style.display = 'block';
  getEl('projectFormSection').style.display = 'none';
  renderProjectsList();
}

function showProjectForm() {
  getEl('projectListSection').style.display = 'none';
  getEl('projectFormSection').style.display = 'block';
}

function getFollowUpStatus(project) {
  if (project.followUpRequired !== 'Yes' || !project.followUpDate) {
    return { label: 'No Follow-up', class: 'status-none' };
  }

  const today = new Date();
  const dueDate = new Date(project.followUpDate);

  today.setHours(0,0,0,0);
  dueDate.setHours(0,0,0,0);

  const diffDays = (dueDate - today) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return { label: 'Overdue', class: 'status-overdue' };
  }

  if (diffDays <= 2) {
    return { label: 'Due Soon', class: 'status-soon' };
  }

  return { label: 'Scheduled', class: 'status-scheduled' };
}

function renderReminderBanner(projects) {
  const banner = document.getElementById('reminderBanner');
  if (!banner) return;

  let overdue = 0;
  let soon = 0;

  projects.forEach(project => {
    const status = getFollowUpStatus(project);

    if (status.class === 'status-overdue') overdue++;
    if (status.class === 'status-soon') soon++;
  });

  if (overdue === 0 && soon === 0) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  banner.style.display = 'block';

  if (overdue > 0) {
    banner.innerHTML = `⚠️ You have <strong>${overdue}</strong> overdue inspection${overdue === 1 ? '' : 's'} requiring attention.`;
  } else {
    banner.innerHTML = `🔔 You have <strong>${soon}</strong> inspection${soon === 1 ? '' : 's'} due soon.`;
  }
}

function renderDashboard(projects) {
  const dashboard = document.getElementById('dashboardSummary');
  if (!dashboard) return;

  let total = projects.length;
  let overdue = 0;
  let soon = 0;
  let scheduled = 0;
  let none = 0;

  projects.forEach(project => {
    const status = getFollowUpStatus(project);

    if (status.class === 'status-overdue') overdue++;
    else if (status.class === 'status-soon') soon++;
    else if (status.class === 'status-scheduled') scheduled++;
    else none++;
  });

  dashboard.innerHTML = `
  <div class="dash-card">Total<br><strong>${total}</strong></div>

  <div class="dash-card dash-overdue">
    🔴 Overdue<br><strong>${overdue}</strong>
  </div>

  <div class="dash-card dash-soon">
    🟠 Due Soon<br><strong>${soon}</strong>
  </div>

  <div class="dash-card dash-scheduled">
    🟢 Scheduled<br><strong>${scheduled}</strong>
  </div>

  <div class="dash-card dash-none">
    ⚪ No Follow-up<br><strong>${none}</strong>
  </div>
`;
}
function renderDashboardMetrics() {

  const container =
    document.getElementById('dashboardMetrics');

  if (!container) return;

  const projects = getProjects();

  const total = projects.length;

  const followUps = projects.filter(
    p => p.followUpRequired === 'Yes'
  );

  const overdue = followUps.filter(p => {

    if (!p.followUpDate) return false;

    return new Date(p.followUpDate) < new Date();

  }).length;

  const dueSoon = followUps.filter(p => {

    if (!p.followUpDate) return false;

    const today = new Date();

    const due = new Date(p.followUpDate);

    const diffDays =
      (due - today) / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= 7;

  }).length;

  const highRisk = projects.filter(p =>
    p.answers?.some(a => a.answer === 'No')
  ).length;

  container.innerHTML = `

    <div class="metric-card">
      <div class="metric-number">${total}</div>
      <div class="metric-label">
        Total Inspections
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-number">${followUps.length}</div>
      <div class="metric-label">
        Follow-ups
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-number">${dueSoon}</div>
      <div class="metric-label">
        Due Soon
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-number">${overdue}</div>
      <div class="metric-label">
        Overdue
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-number">${highRisk}</div>
      <div class="metric-label">
        High Risk
      </div>
    </div>

  `;
}
function getSyncStatus(project) {
  if (project.syncError) {
    return { label: 'Cloud Error', class: 'sync-error' };
  }

  if (project.syncPending) {
    return { label: 'Pending Upload', class: 'sync-pending' };
  }

  return { label: 'Synced', class: 'sync-synced' };
}

function renderProjectsList() {
  const projects = getProjects();
  
  renderReminderBanner(projects);
  renderDashboard(projects);
  renderDashboardMetrics();

  const container = getEl('projectsList');
  const searchField = document.getElementById('projectSearch');
  const searchText = searchField ? searchField.value.trim().toLowerCase() : '';

  container.innerHTML = '';

 const filteredProjects = projects.filter(project => {

  const followStatus = getFollowUpStatus(project);

  // 🔍 SEARCH FILTER
  if (searchText) {
    const placeName = (project.projectName || '').toLowerCase();
    const address = (project.projectAddress || '').toLowerCase();
    const mallName = (project.mallName || '').toLowerCase();
    const unitNumber = (project.unitNumber || '').toLowerCase();

    const matchesSearch =
      placeName.includes(searchText) ||
      address.includes(searchText) ||
      mallName.includes(searchText) ||
      unitNumber.includes(searchText);

    if (!matchesSearch) return false;
  }

  // 🔥 FOLLOW-UP FILTER
  if (currentFilter === 'overdue') {
    return followStatus.class === 'status-overdue';
  }

  if (currentFilter === 'soon') {
    return followStatus.class === 'status-soon';
  }

  if (currentFilter === 'none') {
    return followStatus.class === 'status-none';
  }

  return true; // default = all
});

  filteredProjects.sort((a, b) => {
    const statusOrder = {
      'status-overdue': 1,
      'status-soon': 2,
      'status-scheduled': 3,
      'status-none': 4
    };

    const aStatus = getFollowUpStatus(a).class;
    const bStatus = getFollowUpStatus(b).class;

    if (statusOrder[aStatus] !== statusOrder[bStatus]) {
      return statusOrder[aStatus] - statusOrder[bStatus];
    }

    const aTime = a.lastSaved ? new Date(a.lastSaved).getTime() : 0;
    const bTime = b.lastSaved ? new Date(b.lastSaved).getTime() : 0;

    return bTime - aTime;
  });

  if (filteredProjects.length === 0) {
    container.innerHTML = `<div class="empty-state">No matching inspections found.</div>`;
    return;
  }

  filteredProjects.forEach(project => {

    const syncStatus = getSyncStatus(project);

    const followStatus = getFollowUpStatus(project);
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h3>${escapeHtml(project.projectName || 'Untitled Project')}</h3>

      <div class="project-number">
        ${escapeHtml(project.inspectionNumber || '-')}
      </div>
      
      <div class="project-sync ${syncStatus.class}">
        ${syncStatus.label}
      </div>

      <div class="project-follow ${followStatus.class}">
        ${followStatus.label}
        ${project.followUpDate ? `(${project.followUpDate})` : ''}
      </div>

      <div class="project-meta">
        Inspector: ${escapeHtml(project.inspectorName || '-')}<br>
        Occupancy: ${escapeHtml(project.occupancy || '-')}
      </div>

      <div class="project-actions">
        <button class="small-btn" onclick="openProject('${project.id}')">Open</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openProject(projectId) {
  const projects = getProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  currentProjectId = project.id;
  getEl('projectName').value = project.projectName || '';
  getEl('productType').value = project.productType || 'Fire Safety Officer';
  updateInspectionTypeOptions();
  getEl('organisationName').value = project.organisationName || '';
  getEl('siteName').value = project.siteName || '';
  getEl('inspectionType').value = project.inspectionType || getEl('inspectionType').value;
  getEl('inspectorName').value = project.inspectorName || '';
  getEl('occupancySelect').value = project.occupancy || occupancies[0]["Occupancy Code"];
  getEl('saveMessage').textContent = '';
  getEl('projectAddress').value = project.projectAddress || '';
  getEl('gps').value = project.gps || '';
  getEl('inMall').value = project.inMall || 'No';
  getEl('mallName').value = project.mallName || '';
  getEl('unitNumber').value = project.unitNumber || '';
  getEl('contactPerson').value = project.contactPerson || '';
  getEl('contactTel').value = project.contactTel || '';
  getEl('contactEmail').value = project.contactEmail || '';
  getEl('followUpRequired').value = project.followUpRequired || 'No';
  getEl('followUpDate').value = project.followUpDate || '';
  getEl('followUpNotes').value = project.followUpNotes || '';
  toggleMallFields();

  currentPhotos = project.photos || [];
  renderPhotos();
  updateDisplay();

  if (project.answers) {
   project.answers.forEach(item => {
      const field = document.getElementById(`check_${item.itemIndex}`);
     if (field) {
        field.value = item.answer;
     }

      const noteField = document.getElementById(`note_${item.itemIndex}`);
      if (noteField) {
      noteField.value = item.note || '';
      }
    });
  }

  showProjectForm();
}

function generateInspectionNumber() {
  const projects = getProjects();

  const year = new Date().getFullYear();

  const numbers = projects
    .map(p => p.inspectionNumber)
    .filter(Boolean)
    .map(num => {
      const parts = num.split('-');
      return parseInt(parts[2], 10);
    })
    .filter(n => !isNaN(n));

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1;

  return `FIR-${year}-${String(nextNumber).padStart(4, '0')}`;
}

async function uploadSingleInspection(project) {
  if (!navigator.onLine) return;
  if (typeof supabaseClient === 'undefined') return;
  if (!project || !project.id) return;

  const syncStatus = document.getElementById('syncStatus');

  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !userData || !userData.user) {
      if (syncStatus) syncStatus.textContent = 'Saved locally. Cloud not connected.';
      return;
    }

    if (syncStatus) syncStatus.textContent = 'Uploading saved inspection...';

    const { error } = await supabaseClient
      .from('inspections')
      .upsert({
        id: project.id,
        user_id: userData.user.id,
        inspection_data: project,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Single upload failed:', error);
      if (syncStatus) syncStatus.textContent = `Cloud upload failed: ${error.message}`;
      return;
    }

    markInspectionSynced(project.id);

    if (syncStatus) syncStatus.textContent = 'Saved locally and uploaded to cloud.';
  } catch (err) {
    console.error('Single upload failed:', err);
    if (syncStatus) syncStatus.textContent = 'Saved locally. Cloud upload failed.';
  }
}

async function uploadPendingInspections() {

  if (!navigator.onLine) return;

  const projects = getProjects();

  const pendingProjects = projects.filter(
    p => p.syncPending
  );

  for (const project of pendingProjects) {
    await uploadSingleInspection(project);
  }
}

function markInspectionSynced(projectId) {
  const projects = getProjects();

  const index = projects.findIndex(
    p => p.id === projectId
  );

  if (index === -1) return;

  projects[index] = {
    ...projects[index],

    syncPending: false,
    syncError: false,

    syncedAt: new Date().toISOString()
  };

  setProjects(projects);

  renderProjectsList();
}

function saveProject() {
  const projectName = getEl('projectName').value.trim();
 
  const organisationName = getEl('organisationName').value.trim();
  const siteName = getEl('siteName').value.trim();
  
  const inspectorName = getEl('inspectorName').value.trim();
  const occupancy = getEl('occupancySelect').value;
  
  const projectAddress = getEl('projectAddress').value.trim();
  const gps = getEl('gps').value.trim();
  
  const inMall = getEl('inMall').value;
  const mallName = getEl('mallName').value.trim();
  const unitNumber = getEl('unitNumber').value.trim();
  
  const contactPerson = getEl('contactPerson').value.trim();
  const contactTel = getEl('contactTel').value.trim();
  const contactEmail = getEl('contactEmail').value.trim();
  
  const productType = getEl('productType').value;
  const inspectionType = getEl('inspectionType').value;
  
  const followUpRequired = getEl('followUpRequired').value;
  const followUpDate = getEl('followUpDate').value;
  const followUpNotes = getEl('followUpNotes').value.trim();

  const answers = [];

  document.querySelectorAll('.answer-select').forEach((field, index) => {
    const noteField = document.getElementById(`note_${index}`);

    answers.push({
      itemIndex: index,
      answer: field.value,
      note: noteField ? noteField.value.trim() : ''
    });
  });

  const projects = getProjects();

  if (currentProjectId) {
  const index = projects.findIndex(p => p.id === currentProjectId);

  if (index !== -1) {
    projects[index] = {
      ...projects[index],

      syncPending: true,
      syncError: false,

      inspectionNumber:
        projects[index].inspectionNumber ||
        generateInspectionNumber(),
      projectName,
      organisationName,
      siteName,
      projectAddress,
      gps,
      inMall,
      mallName,
      unitNumber,
      contactPerson,
      contactTel,
      contactEmail,
      productType,
      inspectionType,
      inspectorName,
      occupancy,
      answers,
      followUpRequired,
      followUpDate,
      followUpNotes,
      photos: currentPhotos,
      lastSaved: new Date().toISOString()
    };
  }
} else {
    const newProject = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      
      syncPending: true,
      syncError: false,
      
      inspectionNumber: generateInspectionNumber(),
      projectName,
      organisationName,
      siteName,
      projectAddress,
      gps,
      inMall,
      mallName,
      unitNumber,
      contactPerson,
      contactTel,
      contactEmail,
      productType,
      inspectionType,
      inspectorName,
      occupancy,
      answers,
      photos: currentPhotos,
      followUpRequired: getEl('followUpRequired').value,
      followUpDate: getEl('followUpDate').value,
      followUpNotes: getEl('followUpNotes').value.trim(),
      lastSaved: new Date().toISOString()
    };
      currentProjectId = newProject.id;
    projects.push(newProject);
  }

  setProjects(projects);
  getEl('saveMessage').textContent = `Last saved: ${formatLastSaved()}`;
  renderProjectsList();

  const savedProject = projects.find(p => p.id === currentProjectId);
  uploadSingleInspection(savedProject);

  showProjectList();

}

function createFollowUpInspection() {
  if (!currentProjectId) {
    getEl('saveMessage').textContent = 'Open or save an inspection before creating a follow-up.';
    return;
  }
  
  const projects = getProjects();
  const original = projects.find(p => p.id === currentProjectId);

  if (!original) {
    getEl('saveMessage').textContent = 'Original inspection not found.';
    return;
  }

  const confirmed = confirm(
    'Create a new follow-up inspection from this inspection?'
  );

  if (!confirmed) return;

  const followUpProject = {
    ...original,

    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),

    inspectionNumber: generateInspectionNumber(),

    projectName: `${original.projectName || 'Inspection'} - Follow-up`,

    answers: [],
    photos: [],

    followUpRequired: 'No',
    followUpDate: '',
    followUpNotes: '',

    linkedToInspectionId: original.id,
    linkedToInspectionName: original.projectName || '',
    linkedToInspectionNumber: original.inspectionNumber || '',
    linkedToInspectionDate: original.lastSaved || '',

    lastSaved: new Date().toISOString()
  };

  projects.push(followUpProject);
  setProjects(projects);

  currentProjectId = followUpProject.id;
  currentPhotos = [];

  openProject(followUpProject.id);

  getEl('saveMessage').textContent =
    'Follow-up inspection created.';
}

async function deleteProject() {
  if (!currentProjectId) {
    getEl('saveMessage').textContent = 'Save the project first before deleting.';
    return;
  }

  const confirmed = confirm('Delete this project?');
  if (!confirmed) return;

  const idToDelete = currentProjectId;
  
  let projects = getProjects();
  projects = projects.filter(p => p.id !== currentProjectId);
  
  setProjects(projects);
  
  try {
  console.log('Deleting cloud inspection id:', idToDelete);

  const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !userData || !userData.user) {
    alert('Cloud delete skipped: user not logged in.');
    return;
  }

  const { data, error } = await supabaseClient
    .from('inspections')
    .delete()
    .eq('id', idToDelete)
    .select();

  if (error) {
    console.error('Cloud delete failed:', error);
    alert(`Cloud delete failed: ${error.message}`);
    return;
  }

  console.log('Cloud deleted rows:', data);

  

} catch (err) {
  console.error('Cloud delete failed:', err);
  alert('Cloud delete failed. Check console.');
  return;
}

  currentProjectId = null;
  showProjectList();
}

function updateDisplay() {
  const selected = getEl('occupancySelect').value;

  const reqDiv = getEl('requirements');
  const requirementsSection = document.getElementById('requirementsSection');

  reqDiv.innerHTML = "";

  const selectedRequirements = requirements.filter(r => r["Occupancy Code"] === selected);

  if (selectedRequirements.length === 0) {
    reqDiv.innerHTML = '';

    if (requirementsSection) {
      requirementsSection.style.display = 'none';
    }

    renderChecklist(selected);
    return;
  }

  if (requirementsSection) {
    requirementsSection.style.display = 'block';
  }

  selectedRequirements.forEach(r => {
    reqDiv.innerHTML += `
      <div class="requirement-item">
        <div class="requirement-type">${r["Requirement Type"]}</div>
        <div>${r["Requirement"]}</div>
        <div class="note">Source: ${r["Source"]} | Access: ${r["Free or Paid"]}</div>
      </div>
    `;
  });

  renderChecklist(selected);
}

function updateInspectionTypeOptions() {
  const productType = getEl('productType').value;
  const inspectionSelect = getEl('inspectionType');

  inspectionSelect.innerHTML = '';

  const inspectionTypes = inspectionTemplates[productType]
    ? Object.keys(inspectionTemplates[productType])
    : [];

  if (inspectionTypes.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No inspection types available';
    inspectionSelect.appendChild(option);
    return;
  }

  inspectionTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    inspectionSelect.appendChild(option);
  });
}

function getActiveTemplateChecklist() {
  const productType = getEl('productType').value;
  const inspectionType = getEl('inspectionType').value;
  const occupancy = getEl('occupancySelect').value;

  if (
    inspectionTemplates[productType] &&
    inspectionTemplates[productType][inspectionType]
  ) {
    const template = inspectionTemplates[productType][inspectionType];

    return template.flatMap(section =>
      section.items
        .filter(item => {
          const applicableTo = item["Applicable To"] || ["All"];

          return (
            applicableTo.includes("All") ||
            applicableTo.includes(occupancy)
          );
        })
        .map(item => ({
          ...item,
          Section: section.sectionName
        }))
    );
  }

  return null;
}

function renderChecklist(selected) {
  const chkDiv = getEl('checklist');

  let html = `
    <div class="checklist-toolbar">
      <button type="button" onclick="expandAllSections()">Expand All</button>
      <button type="button" onclick="collapseAllSections()">Collapse All</button>
      <div id="answerSummary" class="answer-summary">Yes: 0 | No: 0 | N/A: 0</div>
    </div>
  `;

  const templateChecklist = getActiveTemplateChecklist();

  const selectedChecklist = templateChecklist || checklists.filter(c =>
    c["Applicable To"] === "All occupancies" || c["Applicable To"] === selected
  );

  if (selectedChecklist.length === 0) {
    chkDiv.innerHTML = `<div class="note">No checklist items found for this occupancy yet.</div>`;
    return;
  }

  let currentSection = null;
  let sectionIndex = -1;

  selectedChecklist.forEach((c, index) => {
    const sectionName = c.Section || "GENERAL";

    if (sectionName !== currentSection) {
      if (currentSection !== null) {
        html += `</div>`;
      }

      sectionIndex++;

      html += `
        <div class="section-header" onclick="toggleSection(${sectionIndex})">
          <span id="arrow_${sectionIndex}">▶</span>
          ${sectionName.toUpperCase()}
        </div>

        <div class="section-group hidden" id="section_${sectionIndex}">
      `;

      currentSection = sectionName;
    }

    const itemId = `check_${index}`;

    html += `
      <div class="checklist-row">
        <div><strong>${c["Item Number"]}.</strong> ${c["Checklist Item"]}</div>
        <div class="note">Answer type: ${c["Answer Type"]}</div>

        <select class="answer-select" id="${itemId}" onchange="handleAnswerChange(this)">
          <option value="">Select answer</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="N/A">N/A</option>
        </select>

        <textarea
          class="note-input"
          id="note_${index}"
          placeholder="Add note for this item..."
          oninput="scheduleAutoSave()"
        ></textarea>
      </div>
    `;
  });

  html += `</div>`;

  chkDiv.innerHTML = html;
  updateAnswerSummary();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}


function generateReport() {
  const projectName = getEl('projectName').value.trim() || 'Untitled Project';
  const inspectorName = getEl('inspectorName').value.trim() || '-';
  const finalComments = getEl('finalComments').value.trim();
  const occupancy = getEl('occupancySelect').value || '-';

  const projectAddress = getEl('projectAddress').value.trim();
  const gps = getEl('gps').value.trim();

  const inMall = getEl('inMall').value || 'No';
  const mallName = getEl('mallName').value.trim();
  const unitNumber = getEl('unitNumber').value.trim();
  const contactPerson = getEl('contactPerson').value.trim();
  const contactTel = getEl('contactTel').value.trim();
  const contactEmail = getEl('contactEmail').value.trim();
  const productType = getEl('productType').value;
  const inspectionType = getEl('inspectionType').value;

  const selectedChecklist = getActiveTemplateChecklist() || [];
  const projects = getProjects();

  const currentProject = projects.find(
    p => p.id === currentProjectId
  );
  const inspectionNumber =
  currentProject?.inspectionNumber || '-';
  const reportContent = getEl('reportContent');

  const followUpRequired = getEl('followUpRequired').value;
  const followUpDate = getEl('followUpDate').value;
  const followUpNotes = getEl('followUpNotes').value.trim();

  let answersHtml = '';
  let actionSections = {};
  let nonCompliance = {};
  let photosHtml = '';

  if (currentPhotos.length > 0) {

    photosHtml += `
      <div class="report-page-break"></div>

      <div class="report-block">
        <h2 class="appendix-title">
          APPENDIX A — PHOTO EVIDENCE
        </h2>
      </div>

      <div class="report-photos">
    `;
  }

  let yesCount = 0;
  let noCount = 0;
  let naCount = 0;

  let currentReportSection = '';
  let sectionYes = 0;
  let sectionNo = 0;
  let sectionHasItems = false;

  function closeReportSection() {
    if (!currentReportSection || !sectionHasItems) return;

    const sectionStatus =
      sectionNo > 0
        ? `Attention Required (${sectionNo} No / ${sectionYes} Yes)`
        : `Compliant (${sectionYes} Yes)`;

    answersHtml += `
      <div class="report-section-status">${sectionStatus}</div>
    `;
  }

  selectedChecklist.forEach((item, index) => {
    const field = document.getElementById(`check_${index}`);
    const rawAnswer = field ? (field.value || 'Not answered') : 'Not answered';
    const answer = rawAnswer.trim();

    const noteField = document.getElementById(`note_${index}`);
    const itemNote = noteField ? noteField.value.trim() : '';

    if (rawAnswer === 'Not answered' && !itemNote) {
      return;
    }

    const sectionName = item.Section || 'General';

    if (sectionName !== currentReportSection) {
      closeReportSection();

      currentReportSection = sectionName;
      sectionYes = 0;
      sectionNo = 0;
      sectionHasItems = false;

      const reportSectionId = `report-section-${sectionName
        .toLowerCase()
        .replaceAll(' ', '-')
        .replaceAll('/', '-')
        .replaceAll('&', 'and')}`;

      answersHtml += `
        <div id="${reportSectionId}" class="report-section-heading">${escapeHtml(sectionName)}</div>
      `;
    }

    if (answer.toLowerCase() === 'yes') {
      yesCount++;
      sectionYes++;
    } else if (answer.toLowerCase() === 'no') {
      noCount++;
      sectionNo++;

      if (!actionSections[sectionName]) {
        actionSections[sectionName] = 0;
      }
      actionSections[sectionName]++;

      if (!nonCompliance[sectionName]) {
        nonCompliance[sectionName] = [];
      }

      nonCompliance[sectionName].push({
      text: item["Non Compliance Text"] || item["Checklist Item"],
      note: itemNote,
      reference: item["Reference"] || ''
    });
    } else if (answer.toUpperCase() === 'N/A') {
      naCount++;
    }

    sectionHasItems = true;

    let answerClass = '';

    if (answer.toLowerCase() === 'no') {
      answerClass = 'answer-no';
    } else if (answer.toLowerCase() === 'yes') {
      answerClass = 'answer-yes';
    } else if (answer.toUpperCase() === 'N/A') {
      answerClass = 'answer-na';
    }

    answersHtml += `
      <div class="report-answer ${answerClass}">
        <strong>${item["Item Number"]}. ${item["Checklist Item"]}</strong><br>
        <strong>Answer:</strong> ${escapeHtml(rawAnswer)}
        ${itemNote ? `<br><strong>Note:</strong> ${escapeHtml(itemNote)}` : ''}
      </div>
    `;
  });

  closeReportSection();

  const totalItems = selectedChecklist.length;
  const answeredCount = yesCount + noCount + naCount;
  const notAnsweredCount = totalItems - answeredCount;

  let overallStatus = 'Compliant / Acceptable';

  if (noCount > 0) {
    overallStatus = 'Attention Required';
  } else if (notAnsweredCount > 0) {
    overallStatus = 'Incomplete Inspection';
  }

  let riskRating = 'LOW RISK';
  let riskComment = 'No significant fire safety risks identified.';

  if (noCount >= 5) {
    riskRating = 'HIGH RISK';
    riskComment = 'Immediate attention required. Multiple fire safety non-compliances identified.';
  } else if (noCount >= 1) {
    riskRating = 'MEDIUM RISK';
    riskComment = 'Fire safety deficiencies identified. Corrective action required.';
  }

  if (notAnsweredCount > 0 && noCount === 0) {
    riskRating = 'INCOMPLETE';
    riskComment = 'Inspection incomplete. Some items were not assessed.';
  }

  let actionHtml = '';

  const sections = Object.keys(actionSections)
    .sort((a, b) => actionSections[b] - actionSections[a]);

  if (sections.length > 0) {
    sections.forEach(section => {
      const count = actionSections[section];
      const label = count === 1 ? 'item' : 'items';

      const actionSectionId = `report-section-${section
        .toLowerCase()
        .replaceAll(' ', '-')
        .replaceAll('/', '-')
        .replaceAll('&', 'and')}`;

      actionHtml += `
        <a class="action-item action-link" href="#${actionSectionId}">
          • ${escapeHtml(section.toUpperCase())} — ${count} No ${label}
        </a>
      `;
    });
  } else {
    actionHtml = `<div class="note">No action required.</div>`;
  }

  let nonComplianceHtml = '';

  const ncSections = Object.keys(nonCompliance);

  if (ncSections.length > 0) {
    ncSections.forEach(section => {
      nonComplianceHtml += `
        <div class="nc-section">
          <div class="nc-heading">${escapeHtml(section.toUpperCase())}</div>
      `;

      nonCompliance[section].forEach(item => {
        nonComplianceHtml += `
          <div class="nc-item">
           - ${escapeHtml(item.text)}
            ${item.reference ? `<br><span class="note">Reference: ${escapeHtml(item.reference)}</span>` : ''}
          </div>
        `;
      });

      nonComplianceHtml += `</div>`;
    });
  } else {
    nonComplianceHtml = `<div class="note">No non-compliances recorded.</div>`;
  }

  if (currentPhotos.length > 0) {
    currentPhotos.forEach((photo, index) => {
      photosHtml += `
  <div class="report-photo-card">

    <div class="report-photo-header">
      Photo ${index + 1}
    </div>

    <div class="report-photo-time">
      Captured:
      ${photo.timestamp
        ? new Date(photo.timestamp).toLocaleString()
        : 'Not recorded'}
    </div>

    <img
      src="${photo.src}"
      class="report-photo-img"
      alt="Inspection photo ${index + 1}"
    >

  </div>
  `; 

  }); 
    photosHtml += `</div>`;
  } else {
    photosHtml = `<div class="note">No photo evidence added.</div>`;
  }

 reportContent.innerHTML = `
  <div class="report-header">

    <div class="report-brand">
      <h1>FIREYE</h1>

      <div class="report-subtitle">
        Fire Safety Inspection Report
      </div>
    </div>

    <div class="report-meta-card">
      <div>
        <strong>Inspection No:</strong>
        ${escapeHtml(inspectionNumber)}
      </div>

      <div>
        <strong>Date:</strong>
        ${new Date().toLocaleDateString()}
      </div>

      <div>
        <strong>Inspector:</strong>
        ${escapeHtml(inspectorName || '-')}
      </div>
    </div>

  </div>

    <div class="report-block">
      <h3>Project Information</h3>
      <div class="report-line"><strong>Place Name:</strong> ${escapeHtml(projectName)}</div>
      <div class="report-line">
        <strong>Inspection Number:</strong>
        ${escapeHtml(inspectionNumber)}
      </div>
      <div class="report-line"><strong>Contact Person:</strong> ${escapeHtml(contactPerson || '-')}</div>
      <div class="report-line"><strong>Telephone:</strong> ${escapeHtml(contactTel || '-')}</div>
      <div class="report-line"><strong>Email:</strong> ${escapeHtml(contactEmail || '-')}</div>
      <div class="report-line"><strong>Product Type:</strong> ${escapeHtml(productType)}</div>
      <div class="report-line"><strong>Inspection Type:</strong> ${escapeHtml(inspectionType)}</div>
      ${currentProject && currentProject.linkedToInspectionId ? `
      <div class="report-line">
        <strong>Follow-up To:</strong>
        ${escapeHtml(currentProject.linkedToInspectionNumber || '-')}
        (${escapeHtml(currentProject.linkedToInspectionName || '-')})
      </div>

      <div class="report-line">
        <strong>Previous Inspection Date:</strong>
        ${
          currentProject.linkedToInspectionDate
            ? escapeHtml(
                new Date(
                  currentProject.linkedToInspectionDate
                ).toLocaleDateString()
              )
            : '-'
        }
      </div>
      ` : ''}
      <div class="report-line"><strong>Address:</strong> ${escapeHtml(projectAddress)}</div>
      <div class="report-line"><strong>GPS:</strong> ${escapeHtml(gps)}</div>
      <div class="report-line"><strong>In Mall/Centre:</strong> ${escapeHtml(inMall)}</div>
      ${inMall === 'Yes' ? `<div class="report-line"><strong>Mall/Centre Name:</strong> ${escapeHtml(mallName)}</div>` : ''}
      ${inMall === 'Yes' ? `<div class="report-line"><strong>Unit / Shop Number:</strong> ${escapeHtml(unitNumber)}</div>` : ''}
      <div class="report-line"><strong>Inspector Name:</strong> ${escapeHtml(inspectorName)}</div>
      <div class="report-line"><strong>Occupancy:</strong> ${escapeHtml(occupancy)}</div>
      <div class="report-line"><strong>Inspection Date:</strong> ${new Date().toLocaleDateString()}</div>
    </div>

    <div class="report-block">
      <h3>Inspection Summary</h3>
      <div class="report-line"><strong>Total Items:</strong> ${totalItems}</div>
      <div class="report-line"><strong>Answered:</strong> ${answeredCount}</div>
      <div class="report-line"><strong>Yes:</strong> ${yesCount}</div>
      <div class="report-line"><strong>No:</strong> ${noCount}</div>
      <div class="report-line"><strong>N/A:</strong> ${naCount}</div>
      <div class="report-line"><strong>Not Answered:</strong> ${notAnsweredCount}</div>
      <div class="report-line"><strong>Overall Status:</strong> <span class="${
        overallStatus === 'Compliant / Acceptable'
          ? 'status-good'
          : overallStatus === 'Attention Required'
          ? 'status-warning'
          : 'status-incomplete'
      }">${overallStatus}</span></div>

      <div class="report-line">
        <strong>Risk Rating:</strong> 
        <span class="${
          riskRating === 'HIGH RISK'
            ? 'risk-high'
            : riskRating === 'MEDIUM RISK'
            ? 'risk-medium'
            : riskRating === 'INCOMPLETE'
            ? 'risk-incomplete'
            : 'risk-low'
        }">${riskRating}</span>
      </div>

      <div class="report-line note">${riskComment}</div>
    </div>

    <div class="report-block">
      <h3>Action Required</h3>
      ${actionHtml}
    </div>

    <div class="report-block">
      <h3>Non-Compliance Details</h3>
      ${nonComplianceHtml}
    </div>

    <div class="report-block">
      <h3>Checklist Results</h3>
      ${answersHtml}
    </div>

    <div class="report-block">
  <h3>Inspector Comments / Conclusion</h3>
  <div>${escapeHtml(finalComments || 'No comments provided.')}</div>
</div>

<div class="report-block">
  <h3>Follow-up / Re-Inspection</h3>

  <div class="report-line">
    <strong>Follow-up Required:</strong> ${escapeHtml(followUpRequired)}
  </div>

  ${followUpRequired === 'Yes' ? `
    <div class="report-line">
      <strong>Follow-up Date:</strong> ${escapeHtml(followUpDate || 'Not specified')}
    </div>

    <div class="report-line">
      <strong>Reason:</strong> ${escapeHtml(followUpNotes || 'No reason provided')}
    </div>
  ` : ''}
</div>

    ${photosHtml}
  `;

  getEl('reportSection').style.display = 'block';
}


function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const img = new Image();

    img.onload = function() {
      const maxWidth = 1200;
      const maxHeight = 1200;

      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      currentPhotos.push({
      src: compressedDataUrl,
      timestamp: new Date().toISOString(),
      note: ''
      });

      renderPhotos();
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

function renderPhotos() {
  const container = getEl('photoPreview');
  container.innerHTML = '';

  currentPhotos.forEach((photo, index) => {
    const div = document.createElement('div');
    div.className = 'photo-item';

    const photoSrc = photo.src;
    const photoTime = new Date(photo.timestamp).toLocaleString();

    div.innerHTML = `
      <img src="${photoSrc}">
      <small class="photo-timestamp">Captured: ${photoTime}</small>

      <textarea
        class="photo-note"
        placeholder="Photo note..."
        oninput="updatePhotoNote(${index}, this.value)"
      >${escapeHtml(photo.note || '')}</textarea>

      <button class="photo-delete" onclick="deletePhoto(${index})">×</button>
    `;

    container.appendChild(div);
  });
}

function deletePhoto(index) {
  currentPhotos.splice(index, 1);
  renderPhotos();
}

function updatePhotoNote(index, value) {
  if (!currentPhotos[index]) return;

  currentPhotos[index].note = value;
  scheduleAutoSave();
}

async function shareReport() {
  const projectName = getEl('projectName').value.trim() || 'Untitled Inspection';
  const inspectorName = getEl('inspectorName').value.trim() || '-';
  const occupancy = getEl('occupancySelect').value || '-';

  const projectAddress = getEl('projectAddress').value.trim() || '-';
  const gps = getEl('gps').value.trim() || '-';

  const contactPerson = getEl('contactPerson').value.trim() || '-';
  const contactTel = getEl('contactTel').value.trim() || '-';
  const contactEmail = getEl('contactEmail').value.trim() || '-';

  const inMall = getEl('inMall').value || 'No';
  const mallName = getEl('mallName').value.trim() || '-';
  const unitNumber = getEl('unitNumber').value.trim() || '-';

  const productType = getEl('productType').value || '-';
  const inspectionType = getEl('inspectionType').value || '-';

  const selectedChecklist = getActiveTemplateChecklist() || [];

  let yesCount = 0;
  let noCount = 0;
  let naCount = 0;

  let actionSections = {};
  let checklistText = '';
  let currentSection = '';

  selectedChecklist.forEach((item, index) => {
    const field = document.getElementById(`check_${index}`);
    const rawAnswer = field ? (field.value || 'Not answered') : 'Not answered';
    const answer = rawAnswer.trim();

    const noteField = document.getElementById(`note_${index}`);
    const itemNote = noteField ? noteField.value.trim() : '';

    if (rawAnswer === 'Not answered' && !itemNote) {
      return;
    }

    const sectionName = item.Section || 'General';

    if (sectionName !== currentSection) {
      currentSection = sectionName;
      checklistText += `\n${sectionName.toUpperCase()}\n`;
    }

    if (answer.toLowerCase() === 'yes') {
      yesCount++;
    } else if (answer.toLowerCase() === 'no') {
      noCount++;

      if (!actionSections[sectionName]) {
        actionSections[sectionName] = 0;
      }

      actionSections[sectionName]++;
    } else if (answer.toUpperCase() === 'N/A') {
      naCount++;
    }

    checklistText += `${item["Item Number"]}. ${item["Checklist Item"]}\n`;
    checklistText += `Answer: ${rawAnswer}\n`;

    if (itemNote) {
      checklistText += `Note: ${itemNote}\n`;
    }

    checklistText += `\n`;
  });

  const totalItems = selectedChecklist.length;
  const answeredCount = yesCount + noCount + naCount;
  const notAnsweredCount = totalItems - answeredCount;

  let overallStatus = 'Compliant / Acceptable';

  if (noCount > 0) {
    overallStatus = 'Attention Required';
  } else if (notAnsweredCount > 0) {
    overallStatus = 'Incomplete Inspection';
  }

  let riskRating = 'LOW RISK';
  let riskComment = 'No significant fire safety risks identified.';

  if (noCount >= 5) {
    riskRating = 'HIGH RISK';
    riskComment = 'Immediate attention required. Multiple fire safety non-compliances identified.';
  } else if (noCount >= 1) {
    riskRating = 'MEDIUM RISK';
    riskComment = 'Fire safety deficiencies identified. Corrective action required.';
  }

  if (notAnsweredCount > 0 && noCount === 0) {
    riskRating = 'INCOMPLETE';
    riskComment = 'Inspection incomplete. Some items were not assessed.';
  }

  let actionText = '';

  const sections = Object.keys(actionSections)
    .sort((a, b) => actionSections[b] - actionSections[a]);

  if (sections.length > 0) {
    sections.forEach(section => {
      const count = actionSections[section];
      const label = count === 1 ? 'item' : 'items';
      actionText += `• ${section.toUpperCase()} — ${count} No ${label}\n`;
    });
  } else {
    actionText = 'No action required.\n';
  }

  const shareText =
`Fireye Fire Safety Report

INSPECTION DETAILS
Place Name: ${projectName}
Contact Person: ${contactPerson}
Telephone: ${contactTel}
Email: ${contactEmail}
Product Type: ${productType}
Inspection Type: ${inspectionType}
Address: ${projectAddress}
GPS: ${gps}
In Mall/Centre: ${inMall}
${inMall === 'Yes' ? `Mall/Centre Name: ${mallName}
Unit / Shop Number: ${unitNumber}
` : ''}Inspector Name: ${inspectorName}
Occupancy: ${occupancy}
Inspection Date: ${new Date().toLocaleDateString()}

INSPECTION SUMMARY
Total Items: ${totalItems}
Answered: ${answeredCount}
Yes: ${yesCount}
No: ${noCount}
N/A: ${naCount}
Not Answered: ${notAnsweredCount}
Overall Status: ${overallStatus}
Risk Rating: ${riskRating}
${riskComment}

ACTION REQUIRED
${actionText}

CHECKLIST RESULTS
${checklistText || 'No checklist answers or notes captured.'}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Fireye Report - ${projectName}`,
        text: shareText
      });

      getEl('saveMessage').textContent = 'Report shared.';
    } catch (error) {
      getEl('saveMessage').textContent = 'Share cancelled or failed.';
      console.error('Share error:', error);
    }
  } else {
    try {
      await navigator.clipboard.writeText(shareText);
      getEl('saveMessage').textContent = 'Share not supported. Report copied to clipboard.';
    } catch (error) {
      getEl('saveMessage').textContent = 'Share not supported on this device.';
      console.error('Clipboard error:', error);
    }
  }
}

function toggleSection(index) {
  const section = document.getElementById(`section_${index}`);
  const arrow = document.getElementById(`arrow_${index}`);

  if (!section) return;

  section.classList.toggle('hidden');

  if (arrow) {
    arrow.textContent = section.classList.contains('hidden') ? '▶' : '▼';
  }
}

function expandAllSections() {
  document.querySelectorAll(".section-group").forEach(section => {
    section.classList.remove("hidden");
  });

  document.querySelectorAll("[id^='arrow_']").forEach(arrow => {
    arrow.textContent = "▼";
  });
}

function collapseAllSections() {
  document.querySelectorAll(".section-group").forEach(section => {
    section.classList.add("hidden");
  });

  document.querySelectorAll("[id^='arrow_']").forEach(arrow => {
    arrow.textContent = "▶";
  });
}

function handleAnswerChange(selectEl) {
  const row = selectEl.closest(".checklist-row");

  if (row) {
    row.classList.remove("has-yes", "has-no", "has-na");

    if (selectEl.value === "Yes") row.classList.add("has-yes");
    if (selectEl.value === "No") row.classList.add("has-no");
    if (selectEl.value === "N/A") row.classList.add("has-na");
  }

  updateAnswerSummary();
  scheduleAutoSave();
}

function updateAnswerSummary() {
  const answers = document.querySelectorAll(".answer-select");

  let yes = 0;
  let no = 0;
  let na = 0;

  answers.forEach(a => {
    if (a.value === "Yes") yes++;
    if (a.value === "No") no++;
    if (a.value === "N/A") na++;
  });

  const summary = document.getElementById("answerSummary");
  if (summary) {
    summary.textContent = `Yes: ${yes} | No: ${no} | N/A: ${na}`;
  }
}

loadData();
window.openProject = openProject;
window.scheduleAutoSave = scheduleAutoSave;
window.toggleChecklistSection = toggleChecklistSection;
window.toggleSection = toggleSection;
window.expandAllSections = expandAllSections;
window.collapseAllSections = collapseAllSections;
window.addEventListener('online', safeDownloadNewerCloudInspections);
window.addEventListener('online', uploadPendingInspections);
window.updatePhotoNote = updatePhotoNote;