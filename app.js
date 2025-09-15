
// ===== Bottom Tab Bar =====
function renderTabbar(activeKey) {
  const tabbar = document.getElementById('tabbar');
  if (!tabbar) return;
  const isActive = k => (k === activeKey ? 'active' : '');
  tabbar.innerHTML = `
    <nav class="tabbar">
      <a href="index.html" class="${isActive('home')}">
        <span class="icon">🏠</span><span>หน้าหลัก</span>
      </a>
      <a href="cars.html" class="${isActive('cars')}">
        <span class="icon">🚗</span><span>ข้อมูลรถ</span>
      </a>
      <a href="add.html" class="${isActive('log')}">
        <span class="icon">📝</span><span>บันทึก</span>
      </a>
      <a href="settings.html" class="${isActive('settings')}">
        <span class="icon">⚙️</span><span>ตั้งค่า</span>
      </a>
    </nav>
  `;
  document.body.classList.add('has-tabbar');
}

// ===== Car Management =====
function loadCars() {
  try { mqttConnect(); } catch(e){ console.warn(e); }
  const cars = JSON.parse(localStorage.getItem("cars") || "[]");
  const listDiv = document.getElementById("car-list");
  if (!listDiv) return;
  listDiv.innerHTML = "";

  cars.forEach((car, index) => {
    try { mqttPublishCarNext(car); } catch(e){ console.warn(e); }
    const div = document.createElement("div");
    div.className = "stat-card";
    const taxTxt = car.taxDueDate ? `${car.taxDueDate} ${car.taxDueTime || ""}` : "—";
    div.innerHTML = `
      <div>
        <div style="font-size:18px;font-weight:700;">${car.plate}</div>
        <div style="font-size:13px;color:#666;">เข้าศูนย์ล่าสุด: ${car.serviceDate} (${car.odometerNow} กม.)</div>
        <div style="font-size:13px;color:#666;">ครั้งถัดไป: ${car.nextServiceDate} (${car.nextOdometer} กม.)</div>
        <div style="font-size:13px;color:#666;">ต่อภาษี: ${taxTxt}</div>
      </div>
      <div>
        <a class="badge" href="add.html" onclick="localStorage.setItem('editIndex',${index})">แก้ไข</a>
        <a class="badge" href="history.html" onclick="localStorage.setItem('historyPlate','${car.plate}')">ประวัติ</a>
      </div>
    `;
    listDiv.appendChild(div);
  });
}

function saveCar(e) {
  e.preventDefault();
  try { mqttConnect(); } catch(e){ console.warn(e); }

  const cars = JSON.parse(localStorage.getItem("cars") || "[]");
  const idx = localStorage.getItem("editIndex");

  const car = {
    plate: document.getElementById("plate").value.trim(),
    serviceDate: document.getElementById("serviceDate").value,
    odometerNow: parseInt(document.getElementById("odometerNow").value || "0", 10),
    nextServiceDate: document.getElementById("nextServiceDate").value,
    nextOdometer: parseInt(document.getElementById("nextOdometer").value || "0", 10),

    maintenance: {
      engineOil:   document.getElementById("m_engineOil").checked,
      gearOil:     document.getElementById("m_gearOil").checked,
      coolant:     document.getElementById("m_coolant").checked,
      flushingOil: document.getElementById("m_flushingOil").checked,
      oilFilter:   document.getElementById("m_oilFilter").checked,
      diffOil:     document.getElementById("m_diffOil").checked,
      airFilter:   document.getElementById("m_airFilter").checked,
      brakeFluid:  document.getElementById("m_brakeFluid").checked,
      wiper:       document.getElementById("m_wiper").checked,
      psFluid:     document.getElementById("m_psFluid").checked,
      notes:       document.getElementById("m_notes").value.trim()
    },

    taxDueDate: document.getElementById("taxDueDate").value,
    taxDueTime: document.getElementById("taxDueTime").value
  };

  if (idx !== null && idx !== "null") {
    cars[parseInt(idx, 10)] = car;
    localStorage.removeItem("editIndex");
  } else {
    cars.push(car);
  }
  localStorage.setItem("cars", JSON.stringify(cars));
  try { mqttPublishCarNext(car); } catch(e){ console.warn(e); }

  alert("บันทึกเรียบร้อย");
  window.location = "cars.html";
}

function editCar(index) {
  localStorage.setItem("editIndex", index);
  window.location = "add.html";
}

function initForm() {
  try { mqttConnect(); } catch(e){ console.warn(e); }
  const idx = localStorage.getItem("editIndex");
  if (idx !== null && idx !== "null") {
    const cars = JSON.parse(localStorage.getItem("cars"));
    const car = cars[parseInt(idx, 10)];

    document.getElementById("plate").value = car.plate || "";
    document.getElementById("serviceDate").value = car.serviceDate || "";
    document.getElementById("odometerNow").value = car.odometerNow || "";
    document.getElementById("nextServiceDate").value = car.nextServiceDate || "";
    document.getElementById("nextOdometer").value = car.nextOdometer || "";
    document.getElementById("taxDueDate").value = car.taxDueDate || "";
    document.getElementById("taxDueTime").value = car.taxDueTime || "";

    if (car.maintenance) {
      document.getElementById("m_engineOil").checked = !!car.maintenance.engineOil;
      document.getElementById("m_gearOil").checked = !!car.maintenance.gearOil;
      document.getElementById("m_coolant").checked = !!car.maintenance.coolant;
      document.getElementById("m_flushingOil").checked = !!car.maintenance.flushingOil;
      document.getElementById("m_oilFilter").checked = !!car.maintenance.oilFilter;
      document.getElementById("m_diffOil").checked = !!car.maintenance.diffOil;
      document.getElementById("m_airFilter").checked = !!car.maintenance.airFilter;
      document.getElementById("m_brakeFluid").checked = !!car.maintenance.brakeFluid;
      document.getElementById("m_wiper").checked = !!car.maintenance.wiper;
      document.getElementById("m_psFluid").checked = !!car.maintenance.psFluid;
      document.getElementById("m_notes").value = car.maintenance.notes || "";
    }
  }
}

function viewHistory(plate) {
  localStorage.setItem("historyPlate", plate);
  window.location = "history.html";
}

function loadHistory() {
  const plate = localStorage.getItem("historyPlate");
  const cars = JSON.parse(localStorage.getItem("cars") || "[]");
  const filtered = cars.filter(c => c.plate === plate);

  const listDiv = document.getElementById("history-list");
  if (!listDiv) return;
  listDiv.innerHTML = `<h2>${plate || ""}</h2>`;

  filtered.forEach(item => {
    const m = item.maintenance || {};
    const sel = [];
    if (m.engineOil) sel.push("น้ำมันเครื่อง");
    if (m.gearOil) sel.push("น้ำมันเกียร์");
    if (m.coolant) sel.push("น้ำยาหม้อน้ำ");
    if (m.flushingOil) sel.push("ฟลัชซิ่งออยล์");
    if (m.oilFilter) sel.push("ไส้กรองน้ำมันเครื่อง");
    if (m.diffOil) sel.push("น้ำมันเฟืองท้าย");
    if (m.airFilter) sel.push("ไส้กรองอากาศ");
    if (m.brakeFluid) sel.push("น้ำมันเบรก");
    if (m.wiper) sel.push("ใบปัดน้ำฝน");
    if (m.psFluid) sel.push("น้ำมันพวงมาลัยเพาเวอร์");

    listDiv.innerHTML += `
      <div class="stat-card" style="flex-direction:column;align-items:flex-start;">
        <p><strong>วันที่เข้ารับบริการ:</strong> ${item.serviceDate}</p>
        <p><strong>เลขกม.:</strong> ${item.odometerNow}</p>
        <p><strong>นัดครั้งถัดไป:</strong> ${item.nextServiceDate} (${item.nextOdometer} กม.)</p>
        <p><strong>รายการบำรุงรักษา:</strong> ${sel.length ? sel.join(", ") : "—"}</p>
        ${m.notes ? `<p><strong>หมายเหตุ:</strong> ${m.notes}</p>` : ""}
      </div>
    `;
  });
}
