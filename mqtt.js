<!-- ใส่เหมือนเดิมในทุกหน้า -->
<script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
<script>
// ====== ตั้งค่าของคุณ ======
const MQTT_BROKER   = "ws://172.16.18.200:9001";   // WebSocket ของ MQTT
const MQTT_USERNAME = "mqttadmin";
const MQTT_PASSWORD = "mqtt1234";

// จะส่ง payload แบบ retained ต่อคันที่ topic: garage/car/<id>/next
// และส่ง Home Assistant MQTT Discovery เพื่อลงทะเบียน sensor อัตโนมัติ
let client = null;

function mqttConnect() {
  if (client) return client;
  client = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 2000,
  });
  client.on("connect", () => console.log("MQTT connected"));
  client.on("error",   err => console.error("MQTT error:", err));
  return client;
}

function mqttPublishCarNext(car) {
  // car = { id/plate, ... , nextServiceDate, nextOdometer, taxDueDate, taxDueTime }
  const topic   = `garage/car/${car.plate}/next`;
  const payload = JSON.stringify({
    id: car.plate,
    next_service_date: car.nextServiceDate,  // YYYY-MM-DD
    next_odometer: car.nextOdometer,         // number
    tax_due_date: car.taxDueDate,            // YYYY-MM-DD
    tax_due_time: car.taxDueTime,            // HH:MM
    // รวมเป็น ISO เพื่อใช้คำนวณใน HA ได้ง่าย
    tax_due_datetime: car.taxDueDate && car.taxDueTime
      ? `${car.taxDueDate}T${car.taxDueTime}:00`
      : (car.taxDueDate ? `${car.taxDueDate}T00:00:00` : "")
  });
  client.publish(topic, payload, { retain: true });
  console.log("MQTT publish:", topic, payload);

  // ส่ง Discovery (ทำเมื่อบันทึกรถ/แก้ไข) เพื่อสร้างเซ็นเซอร์อัตโนมัติใน HA
  publishDiscovery(car);
}

function publishDiscovery(car) {
  // สร้าง sensor สำหรับ: วันที่เข้าศูนย์ครั้งถัดไป, กม.นัดหมาย, วัน/เวลาต่อภาษี
  const dev = {
    identifiers: [`car_${car.plate}`],
    name: `Car ${car.plate}`,
    manufacturer: "Car Service WebApp"
  };

  // 1) next service date
  client.publish(
    `homeassistant/sensor/car_${car.plate}_service_date/config`,
    JSON.stringify({
      name: `Car ${car.plate} Next Service`,
      object_id: `car_${car.plate}_service_date`,
      unique_id: `car_${car.plate}_service_date`,
      state_topic: `garage/car/${car.plate}/next`,
      value_template: "{{ value_json.next_service_date }}",
      json_attributes_topic: `garage/car/${car.plate}/next`,
      device: dev
    }),
    { retain: true }
  );

  // 2) next odometer
  client.publish(
    `homeassistant/sensor/car_${car.plate}_next_odometer/config`,
    JSON.stringify({
      name: `Car ${car.plate} Next Odometer`,
      object_id: `car_${car.plate}_next_odometer`,
      unique_id: `car_${car.plate}_next_odometer`,
      state_topic: `garage/car/${car.plate}/next`,
      value_template: "{{ value_json.next_odometer }}",
      json_attributes_topic: `garage/car/${car.plate}/next`,
      device: dev,
      unit_of_measurement: "km"
    }),
    { retain: true }
  );

  // 3) tax due datetime
  client.publish(
    `homeassistant/sensor/car_${car.plate}_tax_due/config`,
    JSON.stringify({
      name: `Car ${car.plate} Tax Due`,
      object_id: `car_${car.plate}_tax_due`,
      unique_id: `car_${car.plate}_tax_due`,
      state_topic: `garage/car/${car.plate}/next`,
      value_template: "{{ value_json.tax_due_datetime }}",
      json_attributes_topic: `garage/car/${car.plate}/next`,
      device: dev,
      device_class: "timestamp"  // ให้ HA มองเป็นเวลา
    }),
    { retain: true }
  );
}
</script>
