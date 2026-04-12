let occupancies = [];
let requirements = [];
let checklists = [];

async function loadData() {
  occupancies = await fetch('occupancies.json').then(r => r.json());
  requirements = await fetch('requirements.json').then(r => r.json());
  checklists = await fetch('checklists.json').then(r => r.json());

  initApp();
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

  const chkDiv = document.getElementById('checklist');
  chkDiv.innerHTML = "";

  const selectedChecklist = checklists.filter(c =>
    c["Applicable To"] === "All occupancies" || c["Applicable To"] === selected
  );

  if (selectedChecklist.length === 0) {
    chkDiv.innerHTML = `<div class="note">No checklist items found for this occupancy yet.</div>`;
  } else {
    selectedChecklist.forEach(c => {
      chkDiv.innerHTML += `
        <div class="checklist-item">
          <div>☐ ${c["Checklist Item"]}</div>
          <div class="note">Answer type: ${c["Answer Type"]}</div>
        </div>
      `;
    });
  }
}

loadData();