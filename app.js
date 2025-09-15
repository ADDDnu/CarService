<script>
function loadCars() {
  mqttConnect();
  const cars = JSON.parse(localStorage.getItem("cars") || "[]");
  const listDiv = document.getElementById("car-list");
  listDiv.innerHTML = "";

  cars.forEach((car, index) => {
    // ส่ง MQTT (retain) + discovery ทุกครั้งที่เปิดหน้า เพื่อให้ HA อัปเดต
    mqttPublishCarNext(car);

    const div = document.createElement("div");
    div.className = "car-card";
    div.innerHTML = `
      <h3>${car.plate}</h3>
      <p>เข้าศูนย์ล่าสุด: ${car.serviceDate} (${car.odometerNow} กม.)</p>
      <p>ครั้งถัดไป: ${car.nextServiceDate} (${car.nextOdometer} กม.)</p>
      <p>ต่อภาษี: ${car.taxDueDate} เวลา ${car.taxDueTime}</p>
      <button onclick="editCar(${index})">แก้ไข</button>
      <button onclick="viewHistory('${car.plate}')">ประวัติ</button>
    `;
    listDiv.appendChild(div);
  });
}

function saveCar(e) {
  e.preventDefault();
  mqttConnect();

  const cars = JSON.parse(localStorage.getItem("cars") || "[]");
  const idx  = localStorage.getItem("editIndex");
  const car  = {
    plate: document.getElementById("plate").value.trim(),
    serviceDate: document.getElementById("serviceDate").value,
    odometerNow: parseInt(document.getElementById("odometerNow").value, 10),
    nextServiceDate: document.getElementById("nextServiceDate").value,
    nextOdometer: parseInt(document.getElementById("nextOdometer").value, 10),
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

  // ส่ง MQTT + Discovery ทันทีหลังบันทึก
  mqttPublishCarNext(car);

  alert("บันทึกเรียบร้อย");
  window.location = "index.html";
}

function editCar(index) {
  localStorage.setItem("editIndex", index);
  window.location = "add.html";
}

function initForm() {
  mqttConnect();
  const index = localStorage.getItem("editIndex");
  if (index !== null && index !== "null") {
    const cars = JSON.parse(localStorage.getItem("cars"));
    const car = cars[parseInt(index, 10)];
    document.getElementById("plate").value = car.plate;
    document.getElementById("serviceDate").value = car.serviceDate;
    document.getElementById("odometerNow").value = car.odometerNow;
    document.getElementById("nextServiceDate").value = car.nextServiceDate;
    document.getElementById("nextOdometer").value = car.nextOdometer;
    document.getElementById("taxDueDate").value = car.taxDueDate || "";
    document.getElementById("taxDueTime").value = car.taxDueTime || "09:00";
  }
}

function viewHistory(plate) {
  localStorage.setItem("historyPlate", plate);
  window.location = "history.html";
}

function loadHistory() {
  const plate = localStorage.getItem("historyPlate");
  const cars = JSON.parse(localStorage.getItem("cars") || "[]");
  const items = cars.filter(c => c.plate === plate);
  const listDiv = document.getElementById("history-list");
  listDiv.innerHTML = `<h2>${plate}</h2>`;
  items.forEach(item => {
    listDiv.innerHTML += `
      <div class="history-item">
        <p>เข้าศูนย์: ${item.serviceDate} (${item.odometerNow} กม.)</p>
        <p>ครั้งถัดไป: ${item.nextServiceDate} (${item.nextOdometer} กม.)</p>
        <p>ต่อภาษี: ${item.taxDueDate} เวลา ${item.taxDueTime}</p>
      </div>`;
  });
}
</script>
