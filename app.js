
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
function setCars(cars){ localStorage.setItem("cars", JSON.stringify(cars)); }

// ===== Dashboard / Home =====

function renderHome(){
  if (typeof mqttConnect === 'function') try{ mqttConnect(); }catch(e){}
  renderTabbar('home');
  const all = getCars();
  // รวมล่าสุดต่อคัน (key=plate)
  const map = new Map();
  for (let i = all.length - 1; i >= 0; i--) {
    const it = all[i];
    if (!map.has(it.plate)) map.set(it.plate, it);
  }
  const cars = Array.from(map.values());
  const total = cars.length;
  const home = document.getElementById('home');
  let listHTML = '';
  cars.forEach(c => {
    const mm = [c.make, c.model].filter(Boolean).join(' ');
    listHTML += `
      <div class="stat-card">
        <div>
          <div style="font-size:18px;font-weight:800;">${c.plate}</div>
          <div style="font-size:13px;color:#666;">${mm || '—'}</div>
        </div>
        <div style="display:flex;gap:8px;align-self:center;">
          <a class="badge" href="history.html" onclick="localStorage.setItem('historyPlate','${c.plate}')">ดูข้อมูล</a>
          <a class="badge" href="add.html" onclick="localStorage.setItem('editIndex','${all.findIndex(r => r.plate===c.plate)}')">แก้ไข</a>
        </div>
      </div>
    `;
  });

  home.innerHTML = `
    <div class="stat-card">
      <div>
        <div style="font-size:14px;color:#666;">จำนวนรถในระบบ</div>
        <div style="font-size:28px;font-weight:800;">${total}</div>
      </div>
      <a href="cars.html" class="badge">ดูข้อมูลรถ ➜</a>
    </div>
    ${listHTML || '<p>ยังไม่มีข้อมูลรถ กด “บันทึก” ที่แท็บล่างเพื่อเพิ่มคันแรก</p>'}
  `;
}
  renderTabbar('home');
  const cars = getCars();
  const total = cars.length;
  const home = document.getElementById('home');
  home.innerHTML = `
    <div class="stat-card">
      <div>
        <div style="font-size:14px;color:#666;">จำนวนรถในระบบ</div>
        <div style="font-size:28px;font-weight:800;">${total}</div>
      </div>
      <a href="cars.html" class="badge">ดูข้อมูลรถ ➜</a>
    </div>

    <div class="stat-card">
      <div style="font-size:14px;color:#666;">ปุ่มลัด</div>
      <div>
        <a href="add.html" class="badge" style="background:#2e7d32;">บันทึกครั้งใหม่</a>
      </div>
    </div>
  `;
}

// ===== Cars List Page =====
function renderCars(){
  renderTabbar('cars');
  const listDiv = document.getElementById('cars-list');
  const cars = getCars();

  if (!cars.length){
    listDiv.innerHTML = '<p>ยังไม่มีข้อมูลรถ กด “บันทึก” ที่แท็บล่างเพื่อเพิ่มคันแรก</p>';
    return;
    }

  listDiv.innerHTML = "";
  cars.forEach((car, index) => {
    const selected = [];
    if (car.maintenance?.engineOil) selected.push("น้ำมันเครื่อง");
    if (car.maintenance?.oilFilter)  selected.push("ไส้กรองน้ำมันเครื่อง");
    if (car.maintenance?.airFilter)  selected.push("ไส้กรองอากาศ");
    const summary = selected.length ? selected.join(", ") : "—";
    const taxText = car.taxDueDate ? `${car.taxDueDate} ${car.taxDueTime||''}` : "—";

    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div>
        <div style="font-size:18px;font-weight:700;">${car.plate}</div>
        <div style="font-size:13px;color:#666;">เข้าศูนย์ล่าสุด: ${car.serviceDate} (${car.odometerNow} กม.)</div>
        <div style="font-size:13px;color:#666;">ครั้งถัดไป: ${car.nextServiceDate} (${car.nextOdometer} กม.)</div>
        <div style="font-size:13px;color:#666;">ต่อภาษี: ${taxText}</div>
        <div style="font-size:13px;color:#666;">บำรุงรักษา: ${summary}</div>
      </div>
      <div style="display:flex;gap:8px;align-self:center;">
        <a class="badge" href="add.html" onclick="localStorage.setItem('editIndex','${index}')">แก้ไข</a>
        <a class="badge" href="history.html" onclick="localStorage.setItem('historyPlate','${car.plate}')">ดูข้อมูล</a>
      </div>
    `;
    listDiv.appendChild(card);
  });
}

// ===== Add/Edit Page =====
function saveCar(e){
  e.preventDefault();
  if (typeof mqttConnect === 'function') try{ mqttConnect(); }catch(e){}
  const cars = getCars();
  const idx  = localStorage.getItem("editIndex");

  const car  = {
    plate: document.getElementById("plate").value.trim(),
    make: document.getElementById("make") ? document.getElementById("make").value.trim() : "",
    model: document.getElementById("model") ? document.getElementById("model").value.trim() : "",
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
    taxDueDate: document.getElementById("taxDueDate").value,
    taxDueTime: document.getElementById("taxDueTime").value
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
    document.getElementById("serviceDate").value = car.serviceDate;
    if (document.getElementById("make"))  document.getElementById("make").value  = car.make  || "";
    if (document.getElementById("model")) document.getElementById("model").value = car.model || "";
    document.getElementById("odometerNow").value = car.odometerNow;
    document.getElementById("nextServiceDate").value = car.nextServiceDate;
    document.getElementById("nextOdometer").value = car.nextOdometer;
    document.getElementById("taxDueDate").value = car.taxDueDate || "";
    document.getElementById("taxDueTime").value = car.taxDueTime || "09:00";

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
        <p>กำหนดต่อภาษี: ${item.taxDueDate||'—'} ${item.taxDueTime||''}</p>
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
