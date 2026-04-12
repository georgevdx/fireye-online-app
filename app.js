let occupancies = [];
let requirements = [];
let checklists = [];
let currentProjectId = null;

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed to load: ${response.status} ${response.statusText}`);
  }
  return response.json();
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

  document.getElementById('occupancySelect').addEventListener('change', updateDisplay);
  document.getElementById('saveBtn').addEventListener('click', saveProject);
  document.getElementById('deleteBtn').addEventListener('click', deleteProject);
  document.getElementById('newProjectBtn').addEventListener('click', createNewProject);
  document.getElementById('backBtn').addEventListener('click', showProjectList);
}

function populateOccupancies() {
  const select = document.getElementById('occupancySelect');
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
  document.getElementById('projectName').value = '';
  document.getElementById('inspectorName').value = '';
  document.getElementById('occupancySelect').selectedIndex = 0;
  document.getElementById('saveMessage').textContent = '';
  updateDisplay();
  showProjectForm();
}

function showProjectList() {
  document.getElementById('projectListSection').style.display = 'block';
  document.getElementById('projectFormSection').style.display = 'none';
  renderProjectsList();
}

function showProjectForm() {
  document.getElementById('projectListSection').style.display = 'none';
  document.getElementById('projectFormSection').style.display = 'block';
}

function renderProjectsList() {
  const projects = getProjects();
  const container = document.getElementById('projectsList');
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
  document.getElementById('projectName').value = project.projectName || '';
  document.getElementById('inspectorName').value = project.inspectorName || '';
  document.getElementById('occupancySelect').value = project.occupancy || occupancies[0]["Occupancy Code"];
  document.getElementById('saveMessage').textContent = '';

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
  const projectName = document.getElementById('projectName').value.trim();
  const inspectorName = document.getElementById('inspectorName').value.trim();
  const occupancy = document.getElementById('occupancySelect').value;

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
        answers
      };
    }
  } else {
    const newProject = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      projectName,
      inspectorName,
      occupancy,
      answers
    };
    currentProjectId = newProject.id;
    projects.push(newProject);
  }

  setProjects(projects);
  document.getElementById('saveMessage').textContent = 'Project saved on this device.';
  renderProjectsList();
}

function deleteProject() {
  if (!currentProjectId) {
    document.getElementById('saveMessage').textContent = 'Save the project first before deleting.';
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
  const selected = document.getElementById('occupancySelect').value;

  const reqDiv = document.getElementById('requirements');
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
  const chkDiv = document.getElementById('checklist');
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
        <select class="answer-select" id="${itemId}">
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

loadData();
window.openProject = openProject;