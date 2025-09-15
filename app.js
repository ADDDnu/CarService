// ===== Helpers =====
function getCars() { 
  return JSON.parse(localStorage.getItem("cars") || "[]"); 
}
function setCars(cars) { 
  localStorage.setItem("cars", JSON.stringify(cars)); 
  localStorage.setItem("cars_backup", JSON.stringify(cars)); // สำรอง
}

// ===== Import / Export =====
function exportData() {
  const cars = getCars();
  const blob = new Blob([JSON.stringify(cars, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'car_data_backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFromFile(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const cars = JSON.parse(e.target.result);
      if (!Array.isArray(cars)) throw new Error('Bad format');
      setCars(cars);
      alert('นำเข้าข้อมูลสำเร็จ');
      location.reload();
    } catch (err) {
      alert('ไฟล์ไม่ถูกต้อง');
    }
  };
  reader.readAsText(file);
}

// ===== Utilities =====
function vehicleTypeLabel(t) {
  return t === 'motorcycle' ? 'รถจักรยานยนต์' : (t === 'agri' ? 'รถการเกษตร' : 'รถยนต์');
}

// ===== Home =====
function renderHome() {
  const all = getCars();
  const map = new Map();
  for (let i = all.length - 1; i >= 0; i--) {
    const it = all[i];
    if (!map.has(it.plate)) map.set(it.plate, it);
  }

  const cars = Array.from(map.values());
  const groups = { car: [], motorcycle: [], agri: [] };
  cars.forEach(c => (groups[c.type || 'car'] || groups.car).push(c));

  const card = (c) => {
    const mm = [c.make, c.model].filter(Boolean).join(' ');
    return `
      <div class="stat-card">
        <div>
          <div style="font-size:18px;font-weight:800;">${c.plate}</div>
          <div style="font-size:13px;color:#666;">${mm || '—'}</div>
          <div style="font-size:12px;color:#666;">ประเภท: ${vehicleTypeLabel(c.type)}</div>
          <div style="font-size:13px;color:#666;">วันสิ้นอายุภาษี: ${c.taxDueDate || '—'}</div>
        </div>
        <div style="display:flex;gap:8px;align-self:center;">
          <a class="badge" href="history.html" onclick="localStorage.setItem('historyPlate','${c.plate}')">ดูข้อมูล</a>
          <a class="badge" href="add.html" onclick="localStorage.setItem('editIndex','0')">แก้ไข</a>
        </div>
      </div>
    `;
  };

  const section = (title, arr) => arr.length ? `<h2 class="section-title">${title}</h2>` + arr.map(card).join('') : "";
  document.getElementById('home').innerHTML = `
    <div class="stat-card">
      <div>
        <div style="font-size:14px;color:#666;">จำนวนรถในระบบ</div>
        <div style="font-size:28px;font-weight:800;">${cars.length}</div>
      </div>
      <a class="badge" href="cars.html">ดูข้อมูลรถ ➜</a>
    </div>
    ${section('รถยนต์', groups.car)}
    ${section('รถจักรยานยนต์', groups.motorcycle)}
    ${section('รถการเกษตร', groups.agri)}
    ${(!groups.car.length && !groups.motorcycle.length && !groups.agri.length) ? '<p>ยังไม่มีข้อมูลรถ กด “บันทึก” เพื่อเพิ่มคันแรก</p>' : ''}
  `;
}

// ===== Cars =====
function renderCars() {
  const items = getCars();
  const listDiv = document.getElementById('cars-list');
  if (!items.length) { 
    listDiv.innerHTML = '<p>ยังไม่มีข้อมูลรถ</p>'; 
    return; 
  }

  const groups = { car: [], motorcycle: [], agri: [] };
  items.forEach(c => (groups[c.type || 'car'] || groups.car).push(c));

  const build = (arr) => arr.map((car, i) => {
    const mm = [car.make, car.model].filter(Boolean).join(' ');
    const sel = [];
    const m = car.maintenance || {};
    if (m.engineOil) sel.push('น้ำมันเครื่อง');
    if (m.oilFilter) sel.push('ไส้กรองน้ำมันเครื่อง');
    if (m.airFilter) sel.push('ไส้กรองอากาศ');
    const sum = sel.length ? sel.join(', ') : '—';

    return `
      <div class="stat-card">
        <div>
          <div style="font-size:18px;font-weight:700;">${car.plate}</div>
          <div style="font-size:13px;color:#666;">${mm || '—'}</div>
          <div style="font-size:13px;color:#666;">ประเภท: ${vehicleTypeLabel(car.type)}</div>
          <div style="font-size:13px;color:#666;">เข้าศูนย์ล่าสุด: ${car.serviceDate} (${car.odometerNow} กม.)</div>
          <div style="font-size:13px;color:#666;">ครั้งถัดไป: ${car.nextServiceDate} (${car.nextOdometer} กม.)</div>
          <div style="font-size:13px;color:#666;">วันสิ้นอายุภาษี: ${car.taxDueDate || '—'}</div>
          <div style="font-size:13px;color:#666;">บำรุงรักษา: ${sum}</div>
        </div>
        <div style="display:flex;gap:8px;align-self:center;flex-wrap:wrap;">
          <a class="badge" href="add.html" onclick="localStorage.setItem('editIndex','${i}')">แก้ไข</a>
          <button class="badge" type="button" onclick="testPublish(${i})">ทดสอบ MQTT</button>
          <button class="badge" type="button" onclick="duplicateCar(${i})">คัดลอก</button>
          <button class="badge" type="button" onclick="deleteCar(${i})" style="background:#c62828">ลบ</button>
          <a class="badge" href="history.html" onclick="localStorage.setItem('historyPlate','${car.plate}')">ดูข้อมูล</a>
        </div>
      </div>
    `;
  }).join('');

  const section = (t, a) => a.length ? `<h2 class="section-title">${t}</h2>` + build(a) : '';
  listDiv.innerHTML = `
    ${section('รถยนต์', groups.car)}
    ${section('รถจักรยานยนต์', groups.motorcycle)}
    ${section('รถการเกษตร', groups.agri)}
  `;
}

// ===== Add/Edit =====
function saveCar(e) {
  if (e) e.preventDefault();
  const form = document.querySelector('form');
  if (form && !form.checkValidity()) { 
    form.reportValidity(); 
    return; 
  }

  const cars = getCars();
  const idx = localStorage.getItem('editIndex');

  const car = {
    plate: document.getElementById('plate').value.trim(),
    make: document.getElementById('make').value.trim(),
    model: document.getElementById('model').value.trim(),
    type: document.getElementById('vehicleType').value,
    serviceDate: document.getElementById('serviceDate').value,
    odometerNow: parseInt(document.getElementById('odometerNow').value, 10),
    nextServiceDate: document.getElementById('nextServiceDate').value,
    nextOdometer: parseInt(document.getElementById('nextOdometer').value, 10),
    maintenance: {
      engineOil: document.getElementById('m_engineOil').checked,
      gearOil: document.getElementById('m_gearOil').checked,
      coolant: document.getElementById('m_coolant').checked,
      flushingOil: document.getElementById('m_flushingOil').checked,
      oilFilter: document.getElementById('m_oilFilter').checked,
      diffOil: document.getElementById('m_diffOil').checked,
      airFilter: document.getElementById('m_airFilter').checked,
      brakeFluid: document.getElementById('m_brakeFluid').checked,
      wiper: document.getElementById('m_wiper').checked,
      psFluid: document.getElementById('m_psFluid').checked,
      notes: document.getElementById('m_notes').value.trim()
    },
    taxDueDate: document.getElementById('taxDueDate').value
  };

  if (idx !== null && idx !== 'null') {
    cars[parseInt(idx, 10)] = car;
    localStorage.removeItem('editIndex');
  } else {
    cars.push(car);
  }
  setCars(cars);

  // ส่งข้อมูลทั้งหมดไป HA เพื่อบันทึกไฟล์
  if (typeof saveAllToHA === 'function') try { saveAllToHA(cars); } catch (_) {}

  alert('บันทึกเรียบร้อย');
  window.location = 'index.html';
}

function initForm() {
  const index = localStorage.getItem('editIndex');
  if (index !== null && index !== 'null') {
    const cars = getCars();
    const car = cars[parseInt(index, 10)];
    if (car) {
      plate.value = car.plate;
      make.value = car.make || '';
      model.value = car.model || '';
      vehicleType.value = car.type || 'car';
      serviceDate.value = car.serviceDate || '';
      odometerNow.value = car.odometerNow || '';
      nextServiceDate.value = car.nextServiceDate || '';
      nextOdometer.value = car.nextOdometer || '';
      taxDueDate.value = car.taxDueDate || '';

      const m = car.maintenance || {};
      m_engineOil.checked = m.engineOil || false;
      m_gearOil.checked = m.gearOil || false;
      m_coolant.checked = m.coolant || false;
      m_flushingOil.checked = m.flushingOil || false;
      m_oilFilter.checked = m.oilFilter || false;
      m_diffOil.checked = m.diffOil || false;
      m_airFilter.checked = m.airFilter || false;
      m_brakeFluid.checked = m.brakeFluid || false;
      m_wiper.checked = m.wiper || false;
      m_psFluid.checked = m.psFluid || false;
      m_notes.value = m.notes || '';
    }
  }
}

// ===== History =====
function loadHistory() {
  const plate = localStorage.getItem('historyPlate');
  const cars = getCars().filter(c => c.plate === plate);
  const listDiv = document.getElementById('history-list');
  listDiv.innerHTML = `<h2>${plate || ''}</h2>`;

  cars.forEach(item => {
    const m = item.maintenance || {};
    const sel = [];
    if (m.engineOil) sel.push('น้ำมันเครื่อง');
    if (m.gearOil) sel.push('น้ำมันเกียร์');
    if (m.coolant) sel.push('น้ำยาหม้อน้ำ');
    if (m.flushingOil) sel.push('ฟลัชซิ่งออยล์');
    if (m.oilFilter) sel.push('ไส้กรองน้ำมันเครื่อง');
    if (m.diffOil) sel.push('น้ำมันเฟืองท้าย');
    if (m.airFilter) sel.push('ไส้กรองอากาศ');
    if (m.brakeFluid) sel.push('น้ำมันเบรก');
    if (m.wiper) sel.push('ใบปัดน้ำฝน');
    if (m.psFluid) sel.push('น้ำมันพวงมาลัยเพาเวอร์');

    listDiv.innerHTML += `
      <div class="stat-card" style="flex-direction:column;align-items:flex-start">
        <p>วันที่เข้ารับบริการ: ${item.serviceDate}</p>
        <p>เลขกม.: ${item.odometerNow}</p>
        <p>นัดครั้งถัดไป: ${item.nextServiceDate} (${item.nextOdometer} กม.)</p>
        <p>รายการบำรุงรักษา: ${sel.length ? sel.join(', ') : '—'}</p>
        ${m.notes ? `<p>หมายเหตุ: ${m.notes}</p>` : ''}
        <p>วันสิ้นอายุภาษี: ${item.taxDueDate || '—'}</p>
      </div>
    `;
  });
}

// ===== Settings =====
function renderSettings() {
  const cfg = JSON.parse(localStorage.getItem('cfg') || '{}');
  const url = document.getElementById('cfg_mqtt_url');
  const user = document.getElementById('cfg_mqtt_user');
  const pass = document.getElementById('cfg_mqtt_pass');
  if (url) url.value = cfg.mqtt_url || '';
  if (user) user.value = cfg.mqtt_user || '';
  if (pass) pass.value = cfg.mqtt_pass || '';

  const importInput = document.getElementById('import_file');
  if (importInput) importInput.addEventListener('change', importDataFromFile);
}

function saveSettings(e) {
  if (e) e.preventDefault();
  const cfg = {
    mqtt_url: document.getElementById('cfg_mqtt_url').value.trim(),
    mqtt_user: document.getElementById('cfg_mqtt_user').value.trim(),
    mqtt_pass: document.getElementById('cfg_mqtt_pass').value
  };
  localStorage.setItem('cfg', JSON.stringify(cfg));
  alert('บันทึกแล้ว');
}

// ===== Actions =====
function testPublish(index) {
  try { mqttConnect(); } catch (_) {}
  const cars = getCars();
  const car = cars[index];
  if (!car) { alert('ไม่พบข้อมูลรถ'); return; }
  try {
    mqttPublishCarNext(car);
    alert('ส่ง MQTT ทดสอบแล้ว');
  } catch (err) {
    console.error(err);
    alert('ส่ง MQTT ไม่สำเร็จ');
  }
}

function deleteCar(index) {
  const cars = getCars();
  const car = cars[index];
  if (!car) return;
  if (!confirm(`ลบรถทะเบียน ${car.plate}?`)) return;
  cars.splice(index, 1);
  setCars(cars);
  renderCars();
}

function duplicateCar(index) {
  const cars = getCars();
  const car = cars[index];
  if (!car) return;
  const newPlate = prompt('ทะเบียนใหม่', `${car.plate}-copy`);
  if (!newPlate) return;
  const clone = JSON.parse(JSON.stringify(car));
  clone.plate = newPlate.trim();
  cars.push(clone);
  setCars(cars);
  alert('คัดลอกเรียบร้อย');
  renderCars();
}

// ===== Send all cars to HA via MQTT for file saving =====
function saveAllToHA(cars) {
  if (typeof mqttIsConnected === 'function' && mqttIsConnected()) {
    const payload = JSON.stringify(cars);
    mqttClient.publish('carservice/data/save', payload, { qos: 0, retain: true });
    console.log('[MQTT] published all cars to carservice/data/save');
  } else {
    console.warn('MQTT not connected; skip sending data to HA');
  }
}
