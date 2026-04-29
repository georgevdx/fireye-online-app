let occupancies = [];
let requirements = [];
let checklists = [];
let inspectionTemplates = {};
let currentProjectId = null;
let currentPhotos = [];

function buildStreetAddress(address = {}) {
  const houseNumber =
    address.house_number ||
    address.house ||
    address.building ||
    address.building_number ||
    "";

  const road =
    address.road ||
    address.street ||
    address.residential ||
    address.pedestrian ||
    address.footway ||
    "";

  const suburb =
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.quarter ||
    "";

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    "";

  return [
    [houseNumber, road].filter(Boolean).join(" "),
    suburb,
    city
  ]
    .filter(Boolean)
    .join(", ");
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
      projectName,
      projectAddress,
      gps,
      inMall,
      mallName,
      unitNumber,
      inspectorName,
      occupancy,
      answers,
      photos: currentPhotos,
      lastSaved: new Date().toISOString()
    };
  }
} else {
    const newProject = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      projectName,
      projectAddress: [
        getEl('streetNumber').value.trim(),
        getEl('projectAddress').value.trim()
      ].filter(Boolean).join(' '),
      gps,
      inMall,
      mallName,
      unitNumber,
      inspectorName,
      occupancy,
      answers,
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
}

  function formatLastSaved(date = new Date()) {
    return date.toLocaleString();
}

  function exportReport() {
    generateReport();
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

async function loadData() {
  try {
    occupancies = await loadJson('occupancies.json');
    requirements = await loadJson('requirements.json');
    checklists = await loadJson('checklists.json');
    inspectionTemplates = await loadJson('templates.json');
    
    initApp();
    renderProjectsList();
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
  populateOccupancies();

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
  getEl('projectAddress').addEventListener('input', scheduleAutoSave);
  getEl('gps').addEventListener('input', scheduleAutoSave);
  getEl('useLocationBtn').addEventListener('click', useCurrentLocation);
  getEl('inMall').addEventListener('change', toggleMallFields);
  getEl('mallName').addEventListener('input', scheduleAutoSave);
  getEl('unitNumber').addEventListener('input', scheduleAutoSave);
  getEl('projectSearch').addEventListener('input', renderProjectsList);
  getEl('productType').addEventListener('change', () => {
    updateInspectionTypeOptions();
    updateDisplay();
    scheduleAutoSave();
  });

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
  getEl('inspectionType').value = 'General Fire Inspection';
  getEl('inspectorName').value = '';
  getEl('occupancySelect').selectedIndex = 0;
  getEl('saveMessage').textContent = '';
  getEl('projectAddress').value = '';
  getEl('gps').value = '';
  getEl('inMall').value = 'No';
  getEl('mallName').value = '';
  getEl('unitNumber').value = '';  
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

function renderProjectsList() {
  const projects = getProjects();
  const container = getEl('projectsList');
  const searchField = document.getElementById('projectSearch');
  const searchText = searchField ? searchField.value.trim().toLowerCase() : '';

  container.innerHTML = '';

  const filteredProjects = projects.filter(project => {
    if (!searchText) return true;

    const placeName = (project.projectName || '').toLowerCase();
    const address = (project.projectAddress || '').toLowerCase();
    const mallName = (project.mallName || '').toLowerCase();
    const unitNumber = (project.unitNumber || '').toLowerCase();

    return (
      placeName.includes(searchText) ||
      address.includes(searchText) ||
      mallName.includes(searchText) ||
      unitNumber.includes(searchText)
    );
  });

  filteredProjects.sort((a, b) => {
      const aTime = a.lastSaved ? new Date(a.lastSaved).getTime() : 0;
      const bTime = b.lastSaved ? new Date(b.lastSaved).getTime() : 0;
      return bTime - aTime;
    });

  if (filteredProjects.length === 0) {
    container.innerHTML = `<div class="empty-state">No matching inspections found.</div>`;
    return;
  }

  filteredProjects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h3>${escapeHtml(project.projectName || 'Untitled Project')}</h3>
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
  getEl('inspectionType').value = project.inspectionType || getEl('inspectionType').value;
  getEl('inspectorName').value = project.inspectorName || '';
  getEl('occupancySelect').value = project.occupancy || occupancies[0]["Occupancy Code"];
  getEl('saveMessage').textContent = '';
  getEl('projectAddress').value = project.projectAddress || '';
  getEl('gps').value = project.gps || '';
  getEl('inMall').value = project.inMall || 'No';
  getEl('mallName').value = project.mallName || '';
  getEl('unitNumber').value = project.unitNumber || '';
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

function saveProject() {
  const projectName = getEl('projectName').value.trim();
  const inspectorName = getEl('inspectorName').value.trim();
  const occupancy = getEl('occupancySelect').value;
  
  const projectAddress = getEl('projectAddress').value.trim();
  const gps = getEl('gps').value.trim();
  
  const inMall = getEl('inMall').value;
  const mallName = getEl('mallName').value.trim();
  const unitNumber = getEl('unitNumber').value.trim();
  
  const productType = getEl('productType').value;
  const inspectionType = getEl('inspectionType').value;

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
      projectName,
      projectAddress,
      gps,
      inMall,
      mallName,
      unitNumber,
      productType,
      inspectionType,
      inspectorName,
      occupancy,
      answers,
      photos: currentPhotos,
      lastSaved: new Date().toISOString()
    };
  }
} else {
    const newProject = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      projectName,
      projectAddress,
      gps,
      inMall,
      mallName,
      unitNumber,
      productType,
      inspectionType,
      inspectorName,
      occupancy,
      answers,
      photos: currentPhotos,
      lastSaved: new Date().toISOString()
    };
      currentProjectId = newProject.id;
    projects.push(newProject);
  }

  setProjects(projects);
  getEl('saveMessage').textContent = `Last saved: ${formatLastSaved()}`;
  renderProjectsList();
}

function deleteProject() {
  if (!currentProjectId) {
    getEl('saveMessage').textContent = 'Save the project first before deleting.';
    return;
  }

  const confirmed = confirm('Delete this project?');
  if (!confirmed) return;

  let projects = getProjects();
  projects = projects.filter(p => p.id !== currentProjectId);
  setProjects(projects);

  currentProjectId = null;
  showProjectList();
}

function updateDisplay() {
  const selected = getEl('occupancySelect').value;

  const reqDiv = getEl('requirements');
  reqDiv.innerHTML = "";

  const selectedRequirements = requirements.filter(r => r["Occupancy Code"] === selected);

  if (selectedRequirements.length === 0) {
    reqDiv.innerHTML = `<div class="note">No requirements found for this occupancy yet.</div>`;
  } else {
    selectedRequirements.forEach(r => {
      reqDiv.innerHTML += `
        <div class="requirement-item">
          <div class="requirement-type">${r["Requirement Type"]}</div>
          <div>${r["Requirement"]}</div>
          <div class="note">Source: ${r["Source"]} | Access: ${r["Free or Paid"]}</div>
        </div>
      `;
    });
  }

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

  if (
    inspectionTemplates[productType] &&
    inspectionTemplates[productType][inspectionType]
  ) {
    const template = inspectionTemplates[productType][inspectionType];

    return template.flatMap(section =>
      section.items.map(item => ({
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

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    currentPhotos.push(e.target.result);
    renderPhotos();
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

    div.innerHTML = `
      <img src="${photo}">
      <button class="photo-delete" onclick="deletePhoto(${index})">×</button>
    `;

    container.appendChild(div);
  });
}

function deletePhoto(index) {
  currentPhotos.splice(index, 1);
  renderPhotos();
}

function generateReport() {
  const projectName = getEl('projectName').value.trim() || 'Untitled Project';
  const inspectorName = getEl('inspectorName').value.trim() || '-';
  const occupancy = getEl('occupancySelect').value || '-';
  
  const projectAddress = getEl('projectAddress').value.trim();
  const gps = getEl('gps').value.trim();
  
  const inMall = getEl('inMall').value || 'No';
  const mallName = getEl('mallName').value.trim();
  const unitNumber = getEl('unitNumber').value.trim();

  const productType = getEl('productType').value;
  const inspectionType = getEl('inspectionType').value;

  const templateChecklist = getActiveTemplateChecklist();

  const selectedChecklist = templateChecklist || checklists.filter(c =>
    c["Applicable To"] === "All occupancies" || c["Applicable To"] === occupancy
  );

  const reportContent = getEl('reportContent');

  let answersHtml = '';
  let photosHtml = '';   // ✅ BELANGRIK: hier bo
  
  let yesCount = 0;
  let noCount = 0;
  let naCount = 0;
  let notAnsweredCount = 0;
  let currentReportSection = '';

  // Checklist
 selectedChecklist.forEach((item, index) => {
  const field = document.getElementById(`check_${index}`);
  const rawAnswer = field ? (field.value || 'Not answered') : 'Not answered';
  const answer = rawAnswer.trim();

  const noteField = document.getElementById(`note_${index}`);
  const itemNote = noteField ? noteField.value.trim() : '';

  if (answer.toLowerCase() === 'yes') {
    yesCount++;
  } else if (answer.toLowerCase() === 'no') {
    noCount++;
  } else if (answer.toUpperCase() === 'N/A') {
    naCount++;
  } else {
    notAnsweredCount++;
  }

  let answerClass = '';

  if (answer.toLowerCase() === 'no') {
    answerClass = 'answer-no';
  } else if (answer.toLowerCase() === 'yes') {
    answerClass = 'answer-yes';
  } else if (answer.toUpperCase() === 'N/A') {
    answerClass = 'answer-na';
  }

  const sectionName = item.Section || 'General';

  if (sectionName !== currentReportSection) {
    currentReportSection = sectionName;
    answersHtml += `
      <div class="report-section-heading">${escapeHtml(sectionName)}</div>
    `;
  }

  answersHtml += `
    <div class="report-answer ${answerClass}">
      <strong>${item["Item Number"]}. ${item["Checklist Item"]}</strong><br>
      <strong>Answer:</strong> ${escapeHtml(rawAnswer)}
      ${itemNote ? `<br><strong>Note:</strong> ${escapeHtml(itemNote)}` : ''}
    </div>
  `;
});

  const totalItems = selectedChecklist.length;

  let overallStatus = 'Compliant / Acceptable';

  if (noCount > 0) {
    overallStatus = 'Attention Required';
  } else if (notAnsweredCount > 0) {
    overallStatus = 'Incomplete Inspection';
  }

  // Photos
  if (currentPhotos.length > 0) {
    currentPhotos.forEach((photo, index) => {
      photosHtml += `
        <div class="report-photo-item">
          <div><strong>Photo ${index + 1}</strong></div>
          <img src="${photo}" alt="Inspection photo ${index + 1}">
        </div>
      `;
    });
  } else {
    photosHtml = `<div class="note">No photo evidence added.</div>`;
  }

  // Final report
reportContent.innerHTML = `
  <div class="report-header">
  <div class="report-title">Fireye Fire Safety Report</div>
  <div class="report-subtitle">Inspection and checklist summary</div>
  </div>
  
  <div class="report-block">
    <h3>Project Information</h3>
    <div class="report-line"><strong>Place Name:</strong> ${escapeHtml(projectName)}</div>
    <div class="report-line"><strong>Product Type:</strong> ${escapeHtml(productType)}</div>
    <div class="report-line"><strong>Inspection Type:</strong> ${escapeHtml(inspectionType)}</div>
    <div class="report-line"><strong>Address:</strong> ${escapeHtml(projectAddress)}</div>
    <div class="report-line"><strong>GPS:</strong> ${escapeHtml(gps)}</div>

    <div class="report-line"><strong>In Mall/Centre:</strong> ${escapeHtml(inMall)}</div>
    ${inMall === 'Yes' ? `<div class="report-line"><strong>Mall/Centre Name:</strong> ${escapeHtml(mallName)}</div>` : ''}
    ${inMall === 'Yes' ? `<div class="report-line"><strong>Unit / Shop Number:</strong> ${escapeHtml(unitNumber)}</div>` : ''}
    <div class="report-line"><strong>Project Name:</strong> ${escapeHtml(projectName)}</div>
    <div class="report-line"><strong>Inspector Name:</strong> ${escapeHtml(inspectorName)}</div>
    <div class="report-line"><strong>Occupancy:</strong> ${escapeHtml(occupancy)}</div>
    <div class="report-line"><strong>Inspection Date:</strong> ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="report-block">
    <h3>Inspection Summary</h3>
    <div class="report-line"><strong>Total Items:</strong> ${totalItems}</div>
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
  </div>

  <div class="report-block">
    <h3>Checklist Results</h3>
    ${answersHtml}
  </div>

  <div class="report-block">
    <h3>Photo Evidence</h3>
    <div class="report-photos">
      ${photosHtml}
    </div>
  </div>
`;

  getEl('reportSection').style.display = 'block';
  window.print();
}
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const img = new Image();

    img.onload = function() {
      const maxWidth = 500;
      const maxHeight = 500;

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

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

      currentPhotos.push(compressedDataUrl);
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

    div.innerHTML = `
      <img src="${photo}">
      <button class="photo-delete" onclick="deletePhoto(${index})">×</button>
    `;

    container.appendChild(div);
  });
}

function deletePhoto(index) {
  currentPhotos.splice(index, 1);
  renderPhotos();
}


async function shareReport() {
  const projectName = getEl('projectName').value.trim() || 'Untitled Project';
  const inspectorName = getEl('inspectorName').value.trim() || '-';
  const occupancy = getEl('occupancySelect').value || '-';

  const selectedChecklist = checklists.filter(c =>
    c["Applicable To"] === "All occupancies" || c["Applicable To"] === occupancy
  );

  let yesCount = 0;
  let noCount = 0;
  let naCount = 0;
  let notAnsweredCount = 0;

  selectedChecklist.forEach((item, index) => {
    const field = document.getElementById(`check_${index}`);
    const answer = field ? (field.value || 'Not answered') : 'Not answered';

    if (answer === 'Yes') {
      yesCount++;
    } else if (answer === 'No') {
      noCount++;
    } else if (answer === 'N/A') {
      naCount++;
    } else {
      notAnsweredCount++;
    }
  });

  const totalItems = selectedChecklist.length;

  let overallStatus = 'Compliant / Acceptable';
  if (noCount > 0) {
    overallStatus = 'Attention Required';
  } else if (notAnsweredCount > 0) {
    overallStatus = 'Incomplete Inspection';
  }

  const shareText =
    `Fireye Fire Safety Report

    Project Name: ${projectName}
    Inspector Name: ${inspectorName}
    Occupancy: ${occupancy}
    Inspection Date: ${new Date().toLocaleDateString()}

    Inspection Summary
    Total Items: ${totalItems}
    Yes: ${yesCount}
    No: ${noCount}
    N/A: ${naCount}
    Not Answered: ${notAnsweredCount}
    Overall Status: ${overallStatus}`;

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