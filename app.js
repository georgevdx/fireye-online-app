let occupancies = [];
let requirements = [];
let checklists = [];
let currentProjectId = null;
let currentPhotos = [];

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

  if (!projectNameField || !inspectorNameField || !occupancyField) return;

  const projectName = projectNameField.value.trim();
  const inspectorName = inspectorNameField.value.trim();
  const occupancy = occupancyField.value;

  if (!projectName && !inspectorName) return;

  const answers = [];
  document.querySelectorAll('.answer-select').forEach((field, index) => {
    answers.push({
      itemIndex: index,
      answer: field.value
    });
  });

  const projects = getProjects();

  if (currentProjectId) {
    const index = projects.findIndex(p => p.id === currentProjectId);
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        projectName,
        inspectorName,
        occupancy,
        answers,
        photos: currentPhotos
      };
    }
  } else {
    const newProject = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      projectName,
      inspectorName,
      occupancy,
      answers,
      photos: currentPhotos
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

  

async function loadData() {
  try {
    occupancies = await loadJson('occupancies.json');
    requirements = await loadJson('requirements.json');
    checklists = await loadJson('checklists.json');

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
  getEl('inspectorName').value = '';
  getEl('occupancySelect').selectedIndex = 0;
  getEl('saveMessage').textContent = '';
  currentPhotos = [];
  renderPhotos();
  updateDisplay();
  showProjectForm();
}

function showProjectList() {
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
  container.innerHTML = '';

  if (projects.length === 0) {
    container.innerHTML = `<div class="empty-state">No projects saved yet.</div>`;
    return;
  }

  projects.forEach(project => {
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
  getEl('inspectorName').value = project.inspectorName || '';
  getEl('occupancySelect').value = project.occupancy || occupancies[0]["Occupancy Code"];
  getEl('saveMessage').textContent = '';
  currentPhotos = project.photos || [];
  renderPhotos();
  updateDisplay();

  if (project.answers) {
    project.answers.forEach(item => {
      const field = document.getElementById(`check_${item.itemIndex}`);
      if (field) {
        field.value = item.answer;
      }
    });
  }

  showProjectForm();
}

function saveProject() {
  const projectName = getEl('projectName').value.trim();
  const inspectorName = getEl('inspectorName').value.trim();
  const occupancy = getEl('occupancySelect').value;

  const answers = [];
  document.querySelectorAll('.answer-select').forEach((field, index) => {
    answers.push({
      itemIndex: index,
      answer: field.value
    });
  });

  const projects = getProjects();

  if (currentProjectId) {
    const index = projects.findIndex(p => p.id === currentProjectId);
    if (index !== -1) {
      projects[index] = {
      ...projects[index],
      projectName,
      inspectorName,
      occupancy,
      answers,
      photos: currentPhotos
    };
    }
  } else {
    const newProject = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      projectName,
      inspectorName,
      occupancy,
      answers,
      photos: currentPhotos
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

function renderChecklist(selected) {
  const chkDiv = getEl('checklist');
  chkDiv.innerHTML = "";

  const selectedChecklist = checklists.filter(c =>
    c["Applicable To"] === "All occupancies" || c["Applicable To"] === selected
  );

  if (selectedChecklist.length === 0) {
    chkDiv.innerHTML = `<div class="note">No checklist items found for this occupancy yet.</div>`;
    return;
  }

  selectedChecklist.forEach((c, index) => {
    const itemId = `check_${index}`;
    chkDiv.innerHTML += `
      <div class="checklist-row">
        <div><strong>${c["Item Number"]}.</strong> ${c["Checklist Item"]}</div>
        <div class="note">Answer type: ${c["Answer Type"]}</div>
        <select class="answer-select" id="${itemId}" onchange="scheduleAutoSave()">
          <option value="">Select answer</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="N/A">N/A</option>
        </select>
      </div>
    `;
  });
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

  const selectedChecklist = checklists.filter(c =>
    c["Applicable To"] === "All occupancies" || c["Applicable To"] === occupancy
  );

  const reportContent = getEl('reportContent');

  let answersHtml = '';
  let photosHtml = '';   // ✅ BELANGRIK: hier bo
  
  let yesCount = 0;
  let noCount = 0;
  let naCount = 0;
  let notAnsweredCount = 0;

  // Checklist
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
    let answerClass = '';

if (answer === 'No') {
  answerClass = 'answer-no';
} else if (answer === 'Yes') {
  answerClass = 'answer-yes';
} else if (answer === 'N/A') {
  answerClass = 'answer-na';
}

answersHtml += `
  <div class="report-answer ${answerClass}">
    <strong>${item["Item Number"]}. ${item["Checklist Item"]}</strong><br>
    Answer: ${escapeHtml(answer)}
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


loadData();
window.openProject = openProject;
window.scheduleAutoSave = scheduleAutoSave;