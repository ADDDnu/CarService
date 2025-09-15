
// drive.js - Google Drive backup/restore (client-side)
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GDRIVE_DISCOVERY = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const DEFAULT_BACKUP_NAME = 'car_service_backup.json';

function gdriveReadCfg(){
  try { return JSON.parse(localStorage.getItem('gdrive_cfg')||'{}'); } catch(e){ return {}; }
}
function gdriveSaveCfg(cfg){
  localStorage.setItem('gdrive_cfg', JSON.stringify(cfg||{}));
}
function gdriveIsSignedIn(){
  return window.gapi && gapi.auth2 && gapi.auth2.getAuthInstance && gapi.auth2.getAuthInstance().isSignedIn.get();
}
async function gdriveInit(){
  const cfg = gdriveReadCfg();
  if (!cfg.apiKey || !cfg.clientId) {
    alert('กรุณากรอก Google API Key และ OAuth Client ID ก่อน');
    return;
  }
  await new Promise((resolve, reject)=>{
    gapi.load('client:auth2', {callback: resolve, onerror: reject});
  });
  await gapi.client.init({
    apiKey: cfg.apiKey,
    clientId: cfg.clientId,
    discoveryDocs: GDRIVE_DISCOVERY,
    scope: GDRIVE_SCOPE
  });
  return true;
}
async function gdriveSignIn(){
  await gdriveInit();
  if (!gdriveIsSignedIn()){
    await gapi.auth2.getAuthInstance().signIn();
  }
  alert('ลงชื่อเข้าใช้ Google สำเร็จ');
  updateGdriveUI();
}
async function gdriveSignOut(){
  try{
    await gapi.auth2.getAuthInstance().signOut();
  }catch(e){}
  updateGdriveUI();
}
function updateGdriveUI(){
  const el = document.getElementById('gdrive_status');
  if (el){
    el.textContent = gdriveIsSignedIn() ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ';
  }
}

async function gdriveBackup(){
  await gdriveInit();
  if (!gdriveIsSignedIn()) await gdriveSignIn();
  const cars = JSON.parse(localStorage.getItem('cars')||'[]');
  const cfg = gdriveReadCfg();
  const name = (document.getElementById('gdrive_filename')?.value?.trim()) || cfg.filename || DEFAULT_BACKUP_NAME;

  // ค้นหาไฟล์เดิม
  const list = await gapi.client.drive.files.list({
    q: `name='${name.replace("'", "\\'")}' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    spaces: 'drive'
  });
  const files = list.result.files || [];
  const metadata = { name, mimeType: 'application/json' };

  const boundary = '-------314159265358979323846';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelim = '\r\n--' + boundary + '--';
  const content = JSON.stringify(cars, null, 2);
  const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelim;

  let resp;
  if (files.length){
    const fileId = files[0].id;
    resp = await gapi.client.request({
      path: '/upload/drive/v3/files/' + fileId,
      method: 'PATCH',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartBody
    });
  }else{
    resp = await gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartBody
    });
  }
  alert('สำรองข้อมูลขึ้น Google Drive แล้ว');
}

async function gdriveRestore(){
  await gdriveInit();
  if (!gdriveIsSignedIn()) await gdriveSignIn();
  const cfg = gdriveReadCfg();
  const name = (document.getElementById('gdrive_filename')?.value?.trim()) || cfg.filename || DEFAULT_BACKUP_NAME;

  const list = await gapi.client.drive.files.list({
    q: `name='${name.replace("'", "\\'")}' and trashed=false`,
    orderBy: 'modifiedTime desc',
    fields: 'files(id, name, modifiedTime)',
    spaces: 'drive'
  });
  const files = list.result.files || [];
  if (!files.length){
    alert('ไม่พบไฟล์สำรองบน Google Drive');
    return;
  }
  const fileId = files[0].id;
  const fileResp = await gapi.client.drive.files.get({ fileId, alt:'media' });
  let data = fileResp.body;
  // gapi อาจส่งกลับเป็น object แล้วแต่ browser
  if (!data && fileResp.result) data = fileResp.result;
  try{
    if (typeof data === 'string') data = JSON.parse(data);
    if (!Array.isArray(data)) throw new Error('bad format');
    localStorage.setItem('cars', JSON.stringify(data));
    localStorage.setItem('cars_backup', JSON.stringify(data));
    alert('กู้คืนข้อมูลจาก Google Drive สำเร็จ');
    location.reload();
  }catch(e){
    alert('ไฟล์ไม่ถูกต้อง');
  }
}

// Save config from UI
function saveDriveCfg(){
  const apiKey = document.getElementById('gapi_key').value.trim();
  const clientId = document.getElementById('gapi_client').value.trim();
  const filename = document.getElementById('gdrive_filename').value.trim() || DEFAULT_BACKUP_NAME;
  gdriveSaveCfg({ apiKey, clientId, filename });
  alert('บันทึกคีย์ Google Drive แล้ว');
}
