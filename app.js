// ===================== Car Service WebApp — app.js (FIXED) =====================
// - Single definitive implementations (no duplicate functions)
// - Save works reliably (setCars called)
// - Vehicle type supported
// - Home & Cars pages render groups by type
// - Import/Export + Local backup + Paste-import + Restore
// - MQTT actions (if mqtt.js loaded): testPublish()

// ===== Bottom Tab Bar =====
function renderTabbar(activeKey) {
  const tabbar = document.getElementById('tabbar');
  if (!tabbar) return;
  const isActive = k => (k === activeKey ? 'active' : '');
  tabbar.innerHTML = `
    <nav class="tabbar">
      <a href="index.html"    class="${isActive('home')}">
        <span class="icon">🏠</span><span>หน้าหลัก</span>
      </a>
      <a href="cars.html"     class="${isActive('cars')}">
        <span class="icon">🚗</span><span>ข้อมูลรถ</span>
      </a>
      <a href="add.html"      class="${isActive('log')}">
        <span class="icon">📝</span><span>บันทึก</span>
      </a>
      <a href="settings.html" class="${isActive('settings')}">
        <span class="icon">⚙️</span><span>ตั้งค่า</span>
      </a>
    </nav>
  `;
  document.body.classList.add('has-tabbar');
}

// ===== Data Helpers =====
function getCars(){ return JSON.parse(localStorage.getItem("cars") || "[]"); }
function setCars(cars){
  localStorage.setItem("cars", JSON.stringify(cars));
  // local backup to help recovery
  localStorage.setItem("cars_backup", JSON.stringify(cars));
}

// ===== Import / Export (File) =====
function exportData(){
  const cars = getCars();
  const blob = new Blob([JSON.stringify(cars, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'car_data_backup.json'; a.click();
  URL.revokeObjectURL(url);
}

function importDataFromFile(ev){
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const cars = JSON.parse(e.target.result);
      setCars(cars);
      alert('นำเข้าข้อมูลสำเร็จ');
      location.reload();
    }catch(err){
      alert('ไฟล์ไม่ถูกต้อง');
    }
  };
  reader.readAsText(file);
}

// ===== Paste Import / Restore Backup =====
function restoreFromBackup(){
  const txt = localStorage.getItem('cars_backup');
  if (!txt){ alert('ไม่พบข้อมูลสำรองในเบราว์เซอร์'); return; }
  try{
    const data = JSON.parse(txt);
    if (!Array.isArray(data) || !data.length) throw new Error('empty');
    setCars(data);
    alert('กู้คืนจาก backup ภายในเบราว์เซอร์สำเร็จ');
    location.reload();
  }catch(e){
    alert('กู้คืนไม่สำเร็จ');
  }
}

function importFromTextarea(){
  const ta = document.getElementById('paste_json');
  if (!ta || !ta.value.trim()){ alert('ยังไม่มีข้อมูล'); return; }
  try{
    const data = JSON.parse(ta.value.trim());
    setCars(data);
    alert('นำเข้าจากข้อความสำเร็จ');
    location.reload();
  }catch(e){
    alert('รูปแบบ JSON ไม่ถูกต้อง');
  }
}

// ===== Utilities =====
function vehicleTypeLabel(t){
  switch(t){
    case 'car': return 'รถยนต์';
    case 'motorcycle': return 'รถจักรยานยนต์';
    case 'agri': return 'รถการเกษตร';
    default: return 'รถยนต์';
  }
}

// ===== Dashboard / Home =====
function renderHome(){
  if (typeof mqttConnect === 'function') try{ mqttConnect(); }catch(e){}
  renderTabbar('home');
  const all = getCars();
  // ใช้รายการล่าสุดต่อทะเบียน
  const map = new Map();
  for (let i = all.length - 1; i >= 0; i--) {
    const it = all[i];
    if (!map.has(it.plate)) map.set(it.plate, it);
  }
  const cars = Array.from(map.values());
  const total = cars.length;

  // ถ้าไม่มีข้อมูลแต่มีสำรอง เสนอให้กู้คืน
  try {
    const hasNoData = !cars.length;
    const backup = localStorage.getItem('cars_backup');
    if (hasNoData && backup) {
      const data = JSON.parse(backup);
      if (Array.isArray(data) && data.length) {
        if (confirm('พบข้อมูลสำรองในเบราว์เซอร์ ต้องการกู้คืนหรือไม่?')) {
          setCars(data);
          alert('กู้คืนข้อมูลแล้ว');
          return renderHome();
        }
      }
    }
  } catch(e){}

  // Group by type
  const groups = { car: [], motorcycle: [], agri: [] };
  cars.forEach(c => { groups[(c.type||'car')]?.push(c); });

  const cardHTML = (c)=>{
    const mm = [c.make, c.model].filter(Boolean).join(' ');
    const tax = c.taxDueDate || '—';
    return `
      <div class="stat-card">
        <div>
          <div style="font-size:18px;font-weight:800;">${c.plate}</div>
          <div style="font-size:13px;color:#666;">${mm || '—'}</div>
          <div style="font-size:12px;color:#666;">ประเภท: ${vehicleTypeLabel(c.type)}</div>
          <div style="font-size:13px;color:#666;">วันสิ้นอายุภาษี: ${tax}</div>
        </div>
        <div style="display:flex;gap:8px;align-self:center;">
          <a class="badge" href="history.html" onclick="localStorage.setItem('historyPlate','${c.plate}')">ดูข้อมูล</a>
          <a class="badge" href="add.html" onclick="localStorage.setItem('editIndex','${all.findIndex(r => r.plate===c.plate)}')">แก้ไข</a>
        </div>
      </div>
    `;
  };

  const section = (title, arr)=> arr.length ? `<h2 class="section-title">${title}</h2>` + arr.map(cardHTML).join('') : '';

  const home = document.getElementById('home');
  home.innerHTML = `
    <div class="stat-card">
      <div>
        <div style="font-size:14px;color:#666;">จำนวนรถในระบบ</div>
        <div style="font-size:28px;font-weight:800;">${total}</div>
      </div>
      <a href="cars.html" class="badge">ดูข้อมูลรถ ➜</a>
    </div>
    ${section('รถยนต์', groups.car)}
    ${section('รถจักรยานยนต์', groups.motorcycle)}
    ${section('รถการเกษตร', groups.agri)}
    ${(!groups.car.length && !groups.motorcycle.length && !groups.agri.length) ? '<p>ยังไม่มีข้อมูลรถ กด “บันทึก” ที่แท็บล่างเพื่อเพิ่มคันแรก</p>' : ''}
  `;
}

// ===== Cars List Page =====
function renderCars(){
  renderTabbar('cars');
  const listDiv = document.getElementById('cars-list');
  const items = getCars();

  if (!items.length){
    listDiv.innerHTML = '<p>ยังไม่มีข้อมูลรถ กด “บันทึก” ที่แท็บล่างเพื่อเพิ่มคันแรก</p>';
    return;
  }

  // Group by type
  const groups = { car: [], motorcycle: [], agri: [] };
  items.forEach(car => { groups[(car.type||'car')]?.push(car); });

  const buildCards = (cars) => {
    return cars.map((car, index) => {
      const selected = [];
      if (car.maintenance?.engineOil) selected.push("น้ำมันเครื่อง");
      if (car.maintenance?.oilFilter)  selected.push("ไส้กรองน้ำมันเครื่อง");
      if (car.maintenance?.airFilter)  selected.push("ไส้กรองอากาศ");
      const summary = selected.length ? selected.join(", ") : "—";
      const taxText = car.taxDueDate || "—";
      const mm = [car.make, car.model].filter(Boolean).join(' ');

      return `
        <div class="stat-card">
          <div>
            <div style="font-size:18px;font-weight:700;">${car.plate}</div>
            <div style="font-size:13px;color:#666;">${mm || '—'}</div>
            <div style="font-size:13px;color:#666;">ประเภท: ${vehicleTypeLabel(car.type)}</div>
            <div style="font-size:13px;color:#666;">เข้าศูนย์ล่าสุด: ${car.serviceDate} (${car.odometerNow} กม.)</div>
            <div style="font-size:13px;color:#666;">ครั้งถัดไป: ${car.nextServiceDate} (${car.nextOdometer} กม.)</div>
            <div style="font-size:13px;color:#666;">วันสิ้นอายุภาษี: ${taxText}</div>
            <div style="font-size:13px;color:#666;">บำรุงรักษา: ${summary}</div>
          </div>
          <div style="display:flex;gap:8px;align-self:center;flex-wrap:wrap;">
            <a class="badge" href="add.html" onclick="localStorage.setItem('editIndex','${index}')">แก้ไข</a>
            <button class="badge" type="button" onclick="testPublish(${index})">ทดสอบ MQTT</button>
            <button class="badge" type="button" onclick="duplicateCar(${index})">คัดลอก</button>
            <button class="badge" type="button" onclick="deleteCar(${index})" style="background:#c62828">ลบ</button>
            <a class="badge" href="history.html" onclick="localStorage.setItem('historyPlate','${car.plate}')">ดูข้อมูล</a>
          </div>
        </div>
      `;
    }).join('');
  };

  const section = (title, arr)=> arr.length ? `<h2 class="section-title">${title}</h2>` + buildCards(arr) : '';

  listDiv.innerHTML = `
    ${section('รถยนต์', groups.car)}
    ${section('รถจักรยานยนต์', groups.motorcycle)}
    ${section('รถการเกษตร', groups.agri)}
  `;
}

// ===== Add/Edit Page =====
function saveCar(e){
  e.preventDefault();
  if (typeof mqttConnect === 'function') try{ mqttConnect(); }catch(e){}
  const cars = getCars();
  const idx  = localStorage.getItem("editIndex");

  const car  = {
    plate: document.getElementById("plate").value.trim(),
    make:  document.getElementById("make") ? document.getElementById("make").value.trim() : "",
    model: document.getElementById("model") ? document.getElementById("model").value.trim() : "",
    type:  document.getElementById("vehicleType") ? document.getElementById("vehicleType").value : "car",
    serviceDate: document.getElementById("serviceDate").value,
    odometerNow: parseInt(document.getElementById("odometerNow").value, 10),
    nextServiceDate: document.getElementById("nextServiceDate").value,
    nextOdometer: parseInt(document.getElementById("nextOdometer").value, 10),
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
    taxDueDate: document.getElementById("taxDueDate").value
  };

  if (idx !== null && idx !== "null"){
    cars[parseInt(idx,10)] = car;
    localStorage.removeItem("editIndex");
  }else{
    cars.push(car);
  }
  setCars(cars);

  if (typeof mqttPublishCarNext === 'function') try{ mqttPublishCarNext(car); }catch(e){}

  alert("บันทึกเรียบร้อย");
  window.location = "index.html";
}

function editCar(index){
  localStorage.setItem("editIndex", index);
  window.location = "add.html";
}

function initForm(){
  renderTabbar('log');
  if (typeof mqttConnect === 'function') try{ mqttConnect(); }catch(e){}
  const index = localStorage.getItem("editIndex");
  if (index !== null && index !== "null"){
    const cars = getCars();
    const car  = cars[parseInt(index,10)];
    if (!car) return;
    document.getElementById("plate").value = car.plate;
    if (document.getElementById("make"))  document.getElementById("make").value  = car.make  || "";
    if (document.getElementById("model")) document.getElementById("model").value = car.model || "";
    if (document.getElementById("vehicleType")) document.getElementById("vehicleType").value = car.type || "car";
    document.getElementById("serviceDate").value = car.serviceDate;
    document.getElementById("odometerNow").value = car.odometerNow;
    document.getElementById("nextServiceDate").value = car.nextServiceDate;
    document.getElementById("nextOdometer").value = car.nextOdometer;
    document.getElementById("taxDueDate").value = car.taxDueDate || "";

    if (car.maintenance){
      document.getElementById("m_engineOil").checked   = !!car.maintenance.engineOil;
      document.getElementById("m_gearOil").checked     = !!car.maintenance.gearOil;
      document.getElementById("m_coolant").checked     = !!car.maintenance.coolant;
      document.getElementById("m_flushingOil").checked = !!car.maintenance.flushingOil;
      document.getElementById("m_oilFilter").checked   = !!car.maintenance.oilFilter;
      document.getElementById("m_diffOil").checked     = !!car.maintenance.diffOil;
      document.getElementById("m_airFilter").checked   = !!car.maintenance.airFilter;
      document.getElementById("m_brakeFluid").checked  = !!car.maintenance.brakeFluid;
      document.getElementById("m_wiper").checked       = !!car.maintenance.wiper;
      document.getElementById("m_psFluid").checked     = !!car.maintenance.psFluid;
      document.getElementById("m_notes").value         = car.maintenance.notes || "";
    }
  }
}

// ===== History Page =====
function viewHistory(plate){
  localStorage.setItem("historyPlate", plate);
  window.location = "history.html";
}

function loadHistory(){
  renderTabbar('cars');
  const plate = localStorage.getItem("historyPlate");
  const cars = getCars();
  const filtered = cars.filter(c => c.plate === plate);

  const listDiv = document.getElementById("history-list");
  listDiv.innerHTML = `<h2>${plate||''}</h2>`;

  filtered.forEach(item => {
    const sel = [];
    const m = item.maintenance || {};
    if (m.engineOil)   sel.push("น้ำมันเครื่อง");
    if (m.gearOil)     sel.push("น้ำมันเกียร์");
    if (m.coolant)     sel.push("น้ำยาหม้อน้ำ");
    if (m.flushingOil) sel.push("ฟลัชซิ่งออยล์");
    if (m.oilFilter)   sel.push("ไส้กรองน้ำมันเครื่อง");
    if (m.diffOil)     sel.push("น้ำมันเฟืองท้าย");
    if (m.airFilter)   sel.push("ไส้กรองอากาศ");
    if (m.brakeFluid)  sel.push("น้ำมันเบรก");
    if (m.wiper)       sel.push("ใบปัดน้ำฝน");
    if (m.psFluid)     sel.push("น้ำมันพวงมาลัยเพาเวอร์");
    const listText = sel.length ? sel.join(", ") : "—";

    listDiv.innerHTML += `
      <div class="car-card">
        <p>วันที่เข้ารับบริการ: ${item.serviceDate}</p>
        <p>เลขกม.: ${item.odometerNow}</p>
        <p>นัดครั้งถัดไป: ${item.nextServiceDate} (${item.nextOdometer} กม.)</p>
        <p>รายการบำรุงรักษา: ${listText}</p>
        ${m.notes ? `<p>หมายเหตุ: ${m.notes}</p>` : ""}
        <p>วันสิ้นอายุภาษี: ${item.taxDueDate||'—'}</p>
      </div>
    `;
  });
}

// ===== Settings Page =====
function renderSettings(){
  renderTabbar('settings');
  const cfg = JSON.parse(localStorage.getItem('cfg')||'{}');
  const url  = document.getElementById('cfg_mqtt_url');
  const user = document.getElementById('cfg_mqtt_user');
  const pass = document.getElementById('cfg_mqtt_pass');
  if (url){ url.value  = cfg.mqtt_url  || ''; }
  if (user){ user.value = cfg.mqtt_user || ''; }
  if (pass){ pass.value = cfg.mqtt_pass || ''; }
  const importInput = document.getElementById('import_file');
  if (importInput){ importInput.addEventListener('change', importDataFromFile); }
}

function saveSettings(e){
  e.preventDefault();
  const cfg = {
    mqtt_url : document.getElementById('cfg_mqtt_url').value.trim(),
    mqtt_user: document.getElementById('cfg_mqtt_user').value.trim(),
    mqtt_pass: document.getElementById('cfg_mqtt_pass').value
  };
  localStorage.setItem('cfg', JSON.stringify(cfg));
  alert('บันทึกแล้ว');
}

// ===== Actions on car items (Cars page) =====
function testPublish(index){
  try{ mqttConnect(); }catch(e){}
  const cars = getCars();
  const car = cars[index];
  if (!car){ alert('ไม่พบข้อมูลรถ'); return; }
  try{
    mqttPublishCarNext(car);
    alert('ส่ง MQTT ทดสอบแล้ว');
  }catch(err){
    console.error(err);
    alert('ส่ง MQTT ไม่สำเร็จ');
  }
}

function deleteCar(index){
  const cars = getCars();
  const car = cars[index];
  if (!car){ return; }
  if (!confirm(`ลบรถทะเบียน ${car.plate}?`)) return;
  cars.splice(index, 1);
  setCars(cars);
  renderCars();
}

function duplicateCar(index){
  const cars = getCars();
  const car = cars[index];
  if (!car){ return; }
  const newPlate = prompt('ระบุทะเบียนใหม่สำหรับคัดลอก', `${car.plate}-copy`);
  if (!newPlate){ return; }
  const clone = JSON.parse(JSON.stringify(car));
  clone.plate = newPlate.trim();
  cars.push(clone);
  setCars(cars);
  alert('คัดลอกเรียบร้อย');
  renderCars();
}
