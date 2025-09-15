
// ===== MQTT WebSocket Config =====
function getMqttConfig() {
  const cfg = JSON.parse(localStorage.getItem('cfg') || '{}');
  return {
    url: cfg.mqtt_url || "ws://172.16.18.200:9001",
    user: cfg.mqtt_user || "mqttadmin",
    pass: cfg.mqtt_pass || "mqtt1234",
  };
}

let client = null;

function mqttConnect() {
  if (client && client.connected) return client;
  const cfg = getMqttConfig();
  client = mqtt.connect(cfg.url, {
    username: cfg.user,
    password: cfg.pass,
    reconnectPeriod: 2000,
  });
  client.on("connect", () => console.log("MQTT Connected"));
  client.on("error", (err) => console.error("MQTT Error:", err));
  return client;
}

function mqttPublishCarNext(car) {
  if (!client || !client.connected) return;
  const topic = `garage/car/${car.plate}/next`;
  const payload = JSON.stringify({
    id: car.plate,
    next_service_date: car.nextServiceDate,
    next_odometer: car.nextOdometer,
    tax_due_date: car.taxDueDate,
    tax_due_time: car.taxDueTime,
    tax_due_datetime: (car.taxDueDate && car.taxDueTime)
      ? `${car.taxDueDate}T${car.taxDueTime}:00` 
      : (car.taxDueDate ? `${car.taxDueDate}T00:00:00` : ""),
    maintenance: car.maintenance || {}
  });
  client.publish(topic, payload, { retain: true });
  console.log("MQTT Publish:", topic, payload);
}
