let mqttClient = null;
let mqttConnected = false;

function mqttConnect(){
  const cfg = JSON.parse(localStorage.getItem('cfg') || '{}');
  if (!cfg.mqtt_url){ console.warn('MQTT URL ยังไม่ได้ตั้งค่า'); return; }
  try{
    if (mqttClient && mqttConnected) return;
    console.log('[MQTT] connecting:', cfg.mqtt_url);
    mqttClient = mqtt.connect(cfg.mqtt_url, {
      username: cfg.mqtt_user || undefined,
      password: cfg.mqtt_pass || undefined,
      reconnectPeriod: 3000,
      connectTimeout: 10000
    });
    mqttClient.on('connect', ()=>{ mqttConnected=true; console.log('✅ MQTT Connected'); });
    mqttClient.on('reconnect', ()=>{ console.log('↻ MQTT Reconnecting...'); });
    mqttClient.on('close', ()=>{ mqttConnected=false; console.warn('⚠️ MQTT Disconnected'); });
    mqttClient.on('error', (err)=>{ mqttConnected=false; console.error('❌ MQTT Error:', err && err.message?err.message:err); });
  }catch(e){
    mqttConnected=false; console.error('❌ MQTT connect exception:', e);
  }
}
function mqttIsConnected(){ return !!mqttConnected; }

function mqttPublishCarNext(car){
  if (!mqttIsConnected()) throw new Error('MQTT not connected');
  const topic = `garage/car/${(car.plate||'unknown').replace(/\s+/g,'_')}/next`;
  const payload = JSON.stringify({
    plate: car.plate, make: car.make, model: car.model, type: car.type,
    nextServiceDate: car.nextServiceDate, nextOdometer: car.nextOdometer, taxDueDate: car.taxDueDate
  });
  console.log('[MQTT] publish', topic, payload);
  mqttClient.publish(topic, payload, { qos: 0, retain: true });
}
