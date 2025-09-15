
// mqtt.js
// อ่านค่าจาก Settings (LocalStorage) ถ้าไม่มีใช้ค่า default
function readCfg(){
  let cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('cfg')||'{}'); } catch(e){ cfg = {}; }
  return {
    url  : cfg.mqtt_url  || "ws://172.16.18.200:9001",
    user : cfg.mqtt_user || "mqttadmin",
    pass : cfg.mqtt_pass || "mqtt1234"
  };
}

let client = null;

function mqttConnect(){
  if (client && client.connected) return client;
  const cfg = readCfg();
  // eslint-disable-next-line no-undef
  client = mqtt.connect(cfg.url, {
    username: cfg.user,
    password: cfg.pass,
    reconnectPeriod: 2000
  });
  client.on('connect', ()=>console.log('MQTT connected'));
  client.on('error',   err=>console.error('MQTT error:', err));
  return client;
}

// ส่งข้อมูลครั้งถัดไป + วันสิ้นอายุภาษี (date only) + Discovery
function mqttPublishCarNext(car){
  if (!client || !client.connected) mqttConnect();
  const topic = `garage/car/${car.plate}/next`;
  const payload = JSON.stringify({
    id: car.plate,
    make: car.make || "",
    model: car.model || "",
    next_service_date: car.nextServiceDate,
    next_odometer: car.nextOdometer,
    tax_due_date: car.taxDueDate, // YYYY-MM-DD (date only)
    maintenance: car.maintenance || {}
  });
  client.publish(topic, payload, {retain:true});
  console.log('MQTT publish:', topic, payload);
  publishDiscovery(car);
}

function publishDiscovery(car){
  const dev = {
    identifiers: [`car_${car.plate}`],
    name: `Car ${car.plate}`,
    manufacturer: "Car Service WebApp"
  };

  const entries = [
    {
      key:'service_date', name:`Car ${car.plate} Next Service`,
      value_template:"{{ value_json.next_service_date }}", extra:{}
    },
    {
      key:'next_odometer', name:`Car ${car.plate} Next Odometer`,
      value_template:"{{ value_json.next_odometer }}",
      extra:{ unit_of_measurement:"km" }
    },
    {
      key:'tax_due', name:`Car ${car.plate} Tax Due Date`,
      value_template:"{{ value_json.tax_due_date }}",
      extra:{ device_class:"date" } // date only
    }
  ];

  entries.forEach(ent=>{
    const cfgTopic = `homeassistant/sensor/car_${car.plate}_${ent.key}/config`;
    const cfgPayload = JSON.stringify(Object.assign({
      name: ent.name,
      object_id: `car_${car.plate}_${ent.key}`,
      unique_id: `car_${car.plate}_${ent.key}`,
      state_topic: `garage/car/${car.plate}/next`,
      value_template: ent.value_template,
      json_attributes_topic: `garage/car/${car.plate}/next`,
      device: dev
    }, ent.extra || {}));
    client.publish(cfgTopic, cfgPayload, {retain:true});
  });
}
