// ===== LocalStorage Helpers (ต้องมี) =====
function getCars(){ 
  return JSON.parse(localStorage.getItem("cars") || "[]"); 
}
function setCars(cars){
  localStorage.setItem("cars", JSON.stringify(cars));
  localStorage.setItem("cars_backup", JSON.stringify(cars)); // backup เผื่อกู้คืน
}

// ===== Export (.json) =====
function exportData(){
  const cars = getCars();
  if (!cars.length) {
    if (!confirm("ยังไม่มีข้อมูลในระบบ ต้องการ Export ไฟล์ว่างหรือไม่?")) return;
  }
  const blob = new Blob([JSON.stringify(cars, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; 
  a.download = 'car_data_backup.json'; 
  a.click();
  URL.revokeObjectURL(url);
  alert("Export ข้อมูลเรียบร้อย");
}

// ===== Import (.json) =====
function importDataFromFile(ev){
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error("Invalid format");
      setCars(data);
      alert('นำเข้าข้อมูลสำเร็จ');
      location.reload();
    }catch(err){
      console.error(err);
      alert('ไฟล์ไม่ถูกต้อง หรือรูปแบบไม่ใช่ Array');
    }
  };
  reader.readAsText(file);
}

// ===== Settings Page Renderer (แน่ใจว่าผูก Import handler) =====
function renderSettings(){
  // ... (โหลดค่าคอนฟิก MQTT ตามของเดิมของคุณ) ...
  const cfg = JSON.parse(localStorage.getItem('cfg')||'{}');
  const url  = document.getElementById('cfg_mqtt_url');
  const user = document.getElementById('cfg_mqtt_user');
  const pass = document.getElementById('cfg_mqtt_pass');
  if (url){  url.value  = cfg.mqtt_url  || ''; }
  if (user){ user.value = cfg.mqtt_user || ''; }
  if (pass){ pass.value = cfg.mqtt_pass || ''; }

  // ผูก event ให้ input file ของ Import
  const importInput = document.getElementById('import_file');
  if (importInput){ 
    importInput.addEventListener('change', importDataFromFile); 
  }
}

// ===== บันทึกตั้งค่า MQTT (ของเดิม) =====
function saveSettings(e){
  if (e) e.preventDefault();
  const cfg = {
    mqtt_url : document.getElementById('cfg_mqtt_url').value.trim(),
    mqtt_user: document.getElementById('cfg_mqtt_user').value.trim(),
    mqtt_pass: document.getElementById('cfg_mqtt_pass').value
  };
  localStorage.setItem('cfg', JSON.stringify(cfg));
  alert('บันทึกแล้ว');
}
