"use strict";
console.log("BROADCAST.JS: файл загружен");
(() => {
    // =====================================
    // НАСТРОЙКИ
    // =====================================

    const WS_URL = "ws://192.168.0.115:3000/video?role=viewer";

    // =====================================
    // ЭЛЕМЕНТЫ СТРАНИЦЫ
    // =====================================

    const cameraContainer = document.getElementById("cameraContainer");
    const cameraImage = document.getElementById("stream_camera1");

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

    // =====================================
    // ЗАГЛУШКИ ДЛЯ КАМЕР 2–4
    // =====================================

    const placeholderCameras = [
        {
            number: 2,
            id: "DRONE-02 [ЦЕНТР]",
            coord: "53.4071° N, 58.9803° E",
            height: "Высота: 85 м",
            speed: "Скорость: 12 км/ч",
            turn: "Курс: 90° (В)",
            battery: 64,
            ping: "Пинг: 27 мс"
        },
        {
            number: 3,
            id: "DRONE-03 [ЮГ-ПРОМ]",
            coord: "53.3794° N, 59.0125° E",
            height: "Высота: 210 м",
            speed: "Скорость: 68 км/ч",
            turn: "Курс: 180° (Ю)",
            battery: 41,
            ping: "Пинг: 45 мс"
        },
        {
            number: 4,
            id: "DRONE-04 [ЗАПАД]",
            coord: "53.4015° N, 58.9310° E",
            height: "Высота: 50 м",
            speed: "Скорость: 0 км/ч (Зависание)",
            turn: "Курс: 260° (З)",
            battery: 19,
            ping: "Пинг: 62 мс"
        }
    ];

    // =====================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // =====================================

    function setText(elementId, value) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value;
        }
    }

    function formatNumber(value, digits = 1) {
        return Number(value.toFixed(digits)).toString();
    }

    function getDirection(heading) {
        const directions = [
            "С",
            "СВ",
            "В",
            "ЮВ",
            "Ю",
            "ЮЗ",
            "З",
            "СЗ"
        ];

        const normalizedHeading = ((heading % 360) + 360) % 360;
        const index = Math.round(normalizedHeading / 45) % 8;

        return directions[index];
    }

    // =====================================
    // РАСКЛАДКА КАМЕР
    // =====================================

    function setCameraLayout(layout, activeButton) {
        if (!cameraContainer || !activeButton) {
            return;
        }

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
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    viewButtons.forEach((button, index) => {
        if (!button) return;

        button.addEventListener("click", () => {
            setCameraLayout(layouts[index], button);
        });
    });

    // =====================================
    // СТАТУС БАТАРЕИ
    // =====================================

    function updateBatteryStatus(battery) {
        const batteryElement = document.getElementById("buttary_camera1");

        if (!batteryElement || !Number.isFinite(battery)) {
            return;
        }

        let color;

        if (battery <= 20) {
            color = "#e05c5c";
        } else if (battery <= 40) {
            color = "#e4a84f";
        } else {
            color = "#4caf83";
        }

        batteryElement.style.borderLeftColor = color;
    }

    // =====================================
    // ЗАГЛУШКИ КАМЕР 2–4
    // =====================================

    function updatePlaceholderCameras() {
        placeholderCameras.forEach(camera => {
            const number = camera.number;

            setText(`id_camera${number}`, camera.id);
            setText(`coord_camera${number}`, camera.coord);
            setText(`height_camera${number}`, camera.height);
            setText(`speed_camera${number}`, camera.speed);
            setText(`turn_camera${number}`, camera.turn);
            setText(`buttary_camera${number}`, `Батарея: ${camera.battery}%`);
            setText(`ping_camera${number}`, camera.ping);

            const batteryElement = document.getElementById(
                `buttary_camera${number}`
            );

            if (batteryElement) {
                let color;

                if (camera.battery <= 20) {
                    color = "#e05c5c";
                } else if (camera.battery <= 40) {
                    color = "#e4a84f";
                } else {
                    color = "#4caf83";
                }

                batteryElement.style.borderLeftColor = color;
            }
        });
    }

    // =====================================
    // НАЧАЛЬНОЕ СОСТОЯНИЕ КАМЕРЫ 1
    // =====================================

    function initializeLiveCamera() {
        const coordElement = document.getElementById("coord_camera1");

        if (coordElement) {
            coordElement.hidden = true;
        }

        setText("id_camera1", "DRONE ID: —");
        setText("height_camera1", "Высота: —");
        setText("speed_camera1", "Скорость: —");
        setText("turn_camera1", "Курс: —");
        setText("buttary_camera1", "Батарея: —");
        setText("ping_camera1", "Пинг: —");
    }

    // =====================================
    // ОБНОВЛЕНИЕ ДАННЫХ ИЗ UNITY
    // =====================================

    function updateLiveCamera(data) {
        if (!data || !data.position) {
            return;
        }

        // ID дрона
        if (data.droneId !== undefined && data.droneId !== null) {
            setText("id_camera1", `DRONE ID: ${data.droneId}`);
        }

        // Высота
        const altitude = Number.isFinite(data.altitude)
            ? data.altitude
            : data.position.y;

        if (Number.isFinite(altitude)) {
            setText(
                "height_camera1",
                `Высота: ${formatNumber(altitude)} м`
            );
        }

        // Скорость
        if (Number.isFinite(data.speed)) {
            setText(
                "speed_camera1",
                `Скорость: ${formatNumber(data.speed)}`
            );
        }

        // Курс
        if (Number.isFinite(data.heading)) {
            setText(
                "turn_camera1",
                `Курс: ${formatNumber(data.heading)}° (${getDirection(data.heading)})`
            );
        }

        // Батарея
        if (Number.isFinite(data.battery)) {
            const battery = Math.max(0, Math.min(100, data.battery));

            setText(
                "buttary_camera1",
                `Батарея: ${formatNumber(battery)}%`
            );

            updateBatteryStatus(battery);
        }

        // Ping
        if (Number.isFinite(data.ping)) {
            setText(
                "ping_camera1",
                `Пинг: ${formatNumber(data.ping, 0)} мс`
            );
        }
    }

    // =====================================
    // ПОЛУЧЕНИЕ ТЕЛЕМЕТРИИ
    // =====================================

    window.addEventListener("telemetry:update", event => {
    const data = event.detail;

    console.log(
        "BROADCAST: СОБЫТИЕ ПОЛУЧЕНО",
        JSON.stringify(data, null, 4)
    );

    updateLiveCamera(data);

    console.log("BROADCAST: данные переданы в интерфейс");
});

    window.addEventListener("telemetry:status", event => {
        if (event.detail?.connected) {
            console.log("BROADCAST: соединение с телеметрией установлено");
        } else {
            console.warn("BROADCAST: соединение с телеметрией потеряно");
        }
    });

    // =====================================
    // ВИДЕОПОТОК КАМЕРЫ 1
    // =====================================

    function connectCameraStream() {
        if (!cameraImage) {
            console.warn("BROADCAST: изображение stream_camera1 не найдено");
            return;
        }

        const ws = new WebSocket(WS_URL);

        ws.binaryType = "arraybuffer";

        let previousObjectUrl = null;

        ws.onopen = () => {
            console.log("BROADCAST: видеопоток камеры подключён");
        };

        ws.onmessage = event => {
            const blob = new Blob(
                [event.data],
                { type: "image/jpeg" }
            );

            const objectUrl = URL.createObjectURL(blob);

            cameraImage.onload = () => {
                if (previousObjectUrl) {
                    URL.revokeObjectURL(previousObjectUrl);
                }

                previousObjectUrl = objectUrl;
            };

            cameraImage.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                console.error("BROADCAST: ошибка отображения видеокадра");
            };

            cameraImage.src = objectUrl;
        };

        ws.onerror = error => {
            console.error("BROADCAST: ошибка видеопотока", error);
        };

        ws.onclose = event => {
            console.warn("BROADCAST: видеопоток отключён", {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
        };
    }

    // =====================================
    // ЗАПУСК
    // =====================================

    function initBroadcast() {
        if (!cameraContainer) {
            console.warn("WILDFIRE OPS: контейнер камер не найден");
            return;
        }

        initializeLiveCamera();
        updatePlaceholderCameras();

        connectCameraStream();

        console.log("WILDFIRE OPS: мониторинг камер запущен");
    }

    initBroadcast();

})();