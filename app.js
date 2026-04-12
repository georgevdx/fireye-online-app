let occupancies = [];
let requirements = [];
let checklists = [];

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
    loadSavedInspection();
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
  const select = document.getElementById('occupancySelect');
  select.innerHTML = "";

  occupancies.forEach(o => {
    const option = document.createElement('option');
    option.value = o["Occupancy Code"];
    option.textContent = `${o["Occupancy Code"]} - ${o["Occupancy Name"]}`;
    select.appendChild(option);
  });

  select.addEventListener('change', updateDisplay);
  document.getElementById('saveBtn').addEventListener('click', saveInspection);

  updateDisplay();
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
  restoreChecklistAnswers();
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

function saveInspection() {
  const projectName = document.getElementById('projectName').value;
  const inspectorName = document.getElementById('inspectorName').value;
  const occupancy = document.getElementById('occupancySelect').value;

  const answers = [];
  const answerFields = document.querySelectorAll('.answer-select');

  answerFields.forEach((field, index) => {
    answers.push({
      itemIndex: index,
      answer: field.value
    });
  });

  const inspectionData = {
    projectName,
    inspectorName,
    occupancy,
    answers
  };

  localStorage.setItem('fireyeInspection', JSON.stringify(inspectionData));

  document.getElementById('saveMessage').textContent = 'Inspection saved on this device.';
}

function loadSavedInspection() {
  const saved = localStorage.getItem('fireyeInspection');
  if (!saved) return;

  const data = JSON.parse(saved);

  document.getElementById('projectName').value = data.projectName || '';
  document.getElementById('inspectorName').value = data.inspectorName || '';

  const select = document.getElementById('occupancySelect');
  if (data.occupancy) {
    select.value = data.occupancy;
  }

  updateDisplay();
  restoreChecklistAnswers();
}

function restoreChecklistAnswers() {
  const saved = localStorage.getItem('fireyeInspection');
  if (!saved) return;

  const data = JSON.parse(saved);
  if (!data.answers) return;

  data.answers.forEach(item => {
    const field = document.getElementById(`check_${item.itemIndex}`);
    if (field) {
      field.value = item.answer;
    }
  });
}

loadData();