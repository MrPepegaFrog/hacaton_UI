"use strict";


const camerasData = [
    {
        id: "DRONE-01 [СЕВЕР]",
        coord: "53.4182° N, 58.9741° E",
        height: "Высота: 124 м",
        speed: "Скорость: 42 км/ч",
        turn: "Курс: 315° (СЗ)",
        battery: "Батарея: 88%",
        ping: "Пинг: 19 мс"
    },
    {
        id: "DRONE-02 [ЦЕНТР]",
        coord: "53.4071° N, 58.9803° E",
        height: "Высота: 85 м",
        speed: "Скорость: 12 км/ч",
        turn: "Курс: 90° (В)",
        battery: "Батарея: 64%",
        ping: "Пинг: 27 мс"
    },
    {
        id: "DRONE-03 [ЮГ-ПРОМ]",
        coord: "53.3794° N, 59.0125° E",
        height: "Высота: 210 м",
        speed: "Скорость: 68 км/ч",
        turn: "Курс: 180° (Ю)",
        battery: "Батарея: 41%",
        ping: "Пинг: 45 мс"
    },
    {
        id: "DRONE-04 [ЗАПАД]",
        coord: "53.4015° N, 58.9310° E",
        height: "Высота: 50 м",
        speed: "Скорость: 0 км/ч (Зависание)",
        turn: "Курс: 260° (З)",
        battery: "Батарея: 19% [НИЗКИЙ]",
        ping: "Пинг: 62 мс"
    }
];




const cameraContainer = document.getElementById("cameraContainer");

const viewButtons = [
    document.getElementById("window"),
    document.getElementById("TwoXTwo"),
    document.getElementById("TreeXTree")
];

const layouts = [
    "window",
    "TwoXTwo",
    "TreeXTree"
];


function setCameraLayout(layout, activeButton) {

    if (!cameraContainer || !activeButton) return;

    cameraContainer.classList.remove(
        "window",
        "TwoXTwo",
        "TreeXTree"
    );

    cameraContainer.classList.add(layout);

    viewButtons.forEach(button => {

        if (!button) return;

        const isActive = button === activeButton;

        button.classList.toggle("active", isActive);

        button.setAttribute(
            "aria-pressed",
            String(isActive)
        );
    });
}



viewButtons.forEach((button, index) => {

    if (!button) return;

    button.addEventListener("click", () => {

        setCameraLayout(
            layouts[index],
            button
        );

    });

});



function setText(elementId, value) {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = value;
}


function updateCamerasData() {

    camerasData.forEach((camera, index) => {

        const cameraNumber = index + 1;

        const cameraElement = document.getElementById(
            "camera" + cameraNumber
        );

        if (!cameraElement) return;

        setText("id_camera" + cameraNumber, camera.id);
        setText("coord_camera" + cameraNumber, camera.coord);
        setText("height_camera" + cameraNumber, camera.height);
        setText("speed_camera" + cameraNumber, camera.speed);
        setText("turn_camera" + cameraNumber, camera.turn);
        setText("buttary_camera" + cameraNumber, camera.battery);
        setText("ping_camera" + cameraNumber, camera.ping);

        updateBatteryStatus(
            cameraNumber,
            camera.battery
        );

    });

}

function updateBatteryStatus(cameraNumber, batteryText) {

    const batteryElement = document.getElementById(
        "buttary_camera" + cameraNumber
    );

    if (!batteryElement) return;

    const batteryMatch = batteryText.match(/(\d+)%/);

    if (!batteryMatch) return;

    const batteryLevel = Number(batteryMatch[1]);

    let statusColor;

    if (batteryLevel <= 20) {

        statusColor = "#e05c5c";

    } else if (batteryLevel <= 40) {

        statusColor = "#e4a84f";

    } else {

        statusColor = "#4caf83";

    }

    batteryElement.style.borderLeftColor = statusColor;
}

function initBroadcast() {

    if (!cameraContainer) {
        console.warn("WILDFIRE OPS: контейнер камер не найден.");
        return;
    }

    updateCamerasData();

    console.log(
        "WILDFIRE OPS: мониторинг камер загружен."
    );

}


/* Запуск страницы */

initBroadcast();




