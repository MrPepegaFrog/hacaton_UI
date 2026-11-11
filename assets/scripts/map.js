(() => {
    'use strict';

    // =====================================
    // НАСТРОЙКИ
    // =====================================
    const DRONE_SIZE = 18;
    const MAP_BOUNDS = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    const SMOOTHING = 0.045;
    const TURN_SMOOTHING = 0.08;
    const MAX_ROUTE_POINTS = 500;

    // =====================================
    // ЭЛЕМЕНТЫ DOM
    // =====================================
    const canvas = document.getElementById('mapCanvas');
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('map-image'); // Фоновая картинка

    if (!canvas || !mapContainer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Элементы интерфейса
    const droneInfo = document.getElementById('droneInfo');
    const closeDroneInfo = document.getElementById('closeDroneInfo');
    const infoTitle = document.getElementById('infoTitle');
    const infoName = document.getElementById('infoName');
    const infoId = document.getElementById('infoId');
    const infoStatus = document.getElementById('infoStatus');
    const infoBattery = document.getElementById('infoBattery');
    const batteryLevel = document.getElementById('batteryLevel');
    const infoCoordX = document.getElementById('infoCoordX');
    const infoCoordZ = document.getElementById('infoCoordZ');
    const metricBattery = document.getElementById('metricBattery');
    const lastUpdated = document.getElementById('lastUpdated');

    // Кнопки управления
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const recenterMapBtn = document.getElementById('recenterMap');

    // =====================================
    // ДАННЫЕ И СОСТОЯНИЕ
    // =====================================
    const droneData = {
        id: '—',
        name: '—',
        x: 0,
        z: 0,
        battery: 0,
        heading: 0,
        status: 'waiting',
        hasTelemetry: false
    };
    const routePoints = [];
    let telemetryConnected = false;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let pixelRatio = 1;

    // Плавные координаты дрона на экране (без учета зума/пана)
    let drawX = 0;
    let drawY = 0;
    let drawHeading = 0;
    let targetHeading = 0;

    let selected = false;
    let animationFrame = null;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ УПРАВЛЕНИЯ КАРТОЙ
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;

    // =====================================
    // ПРЕОБРАЗОВАНИЕ КООРДИНАТ
    // =====================================
    function worldToScreen(x, z) {
        const normalizedX = (x - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
        const normalizedZ = (z - MAP_BOUNDS.minZ) / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ);
        return {
            x: normalizedX * canvasWidth,
            y: (1 - normalizedZ) * canvasHeight // Инверсия Z для Canvas Y
        };
    }

    // =====================================
    // ИЗМЕНЕНИЕ РАЗМЕРА CANVAS
    // =====================================
    function resizeCanvas() {
        const rect = mapContainer.getBoundingClientRect();
        canvasWidth = Math.max(1, rect.width);
        canvasHeight = Math.max(1, rect.height);
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(canvasWidth * pixelRatio);
        canvas.height = Math.round(canvasHeight * pixelRatio);

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        // При ресайзе сбрасываем пан и зум для корректного отображения
        zoom = 1;
        panX = 0;
        panY = 0;

        if (droneData.hasTelemetry) {
            const pos = worldToScreen(droneData.x, droneData.z);
            drawX = pos.x;
            drawY = pos.y;
        }
        draw();
    }

    if ('ResizeObserver' in window) {
        new ResizeObserver(resizeCanvas).observe(mapContainer);
    } else {
        window.addEventListener('resize', resizeCanvas);
    }

    // =====================================
    // УПРАВЛЕНИЕ КАРТОЙ (ЗУМ И ПАН)
    // =====================================

    // Функция зума с фокусом на центр (или точку мыши)
    function applyZoom(delta, focalX, focalY) {
        const oldZoom = zoom;
        zoom = Math.max(0.5, Math.min(5, zoom + delta)); // Ограничиваем зум от 0.5x до 5x

        // Математика зума в точку (чтобы карта не улетала при приближении)
        const zoomFactor = zoom / oldZoom;
        panX = focalX - (focalX - panX) * zoomFactor;
        panY = focalY - (focalY - panY) * zoomFactor;

        draw();
    }

    // Кнопки зума
    zoomInBtn?.addEventListener('click', () => {
        applyZoom(0.3, canvasWidth / 2, canvasHeight / 2);
    });

    zoomOutBtn?.addEventListener('click', () => {
        applyZoom(-0.3, canvasWidth / 2, canvasHeight / 2);
    });

    // Кнопка центрирования (тот самый "кружок")
    recenterMapBtn?.addEventListener('click', () => {
        zoom = 1;
        panX = 0;
        panY = 0;
        draw();
    });

    // Зум колесиком мыши
    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        applyZoom(delta, mouseX, mouseY);
    }, { passive: false });

    // Перетаскивание карты (Pan)
    mapContainer.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Только левая кнопка мыши
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        mapContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        draw();
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        mapContainer.style.cursor = 'grab';
    });

    // =====================================
    // ТЕЛЕМЕТРИЯ
    // =====================================

    window.addEventListener('telemetry:update', (event) => {
        const data = event.detail;

        if (
            !data?.position ||
            !Number.isFinite(data.position.x) ||
            !Number.isFinite(data.position.z)
        ) {
            console.warn('Некорректные координаты телеметрии:', data);
            return;
        }

        // =====================================
        // ID И НАЗВАНИЕ ДРОНА
        // =====================================

        if (data.droneId !== undefined && data.droneId !== null) {
            droneData.id = String(data.droneId);
        }

        if (data.droneName !== undefined && data.droneName !== null) {
            droneData.name = String(data.droneName);
        }

        // =====================================
        // КООРДИНАТЫ
        // =====================================

        droneData.x = data.position.x;
        droneData.z = data.position.z;

        // =====================================
        // БАТАРЕЯ
        // =====================================

        if (
            Number.isFinite(data.battery)
        ) {
            droneData.battery = data.battery;

            if (metricBattery) {
                metricBattery.textContent = Math.round(data.battery);
            }
        }

        // =====================================
        // НАПРАВЛЕНИЕ
        // =====================================

        if (Number.isFinite(data.heading)) {
            droneData.heading = data.heading;
        }

        // =====================================
        // СТАТУС
        // =====================================

        droneData.status = 'active';
        droneData.hasTelemetry = true;

        // =====================================
        // МАРШРУТ
        // =====================================

        const lastPoint = routePoints[routePoints.length - 1];

        if (
            !lastPoint ||
            Math.hypot(
                data.position.x - lastPoint.x,
                data.position.z - lastPoint.z
            ) > 0.01
        ) {
            routePoints.push({
                x: data.position.x,
                z: data.position.z
            });

            if (routePoints.length > MAX_ROUTE_POINTS) {
                routePoints.shift();
            }
        }

        // =====================================
        // ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
        // =====================================

        if (lastUpdated) {
            lastUpdated.textContent =
                new Date().toLocaleTimeString('ru-RU');
        }

        if (selected) {
            updateDroneInfo();
        }

        if (reducedMotion) {
            draw();
        }
    });


    window.addEventListener('telemetry:status', (event) => {
        telemetryConnected = event.detail.connected;
        if (!telemetryConnected && !droneData.hasTelemetry) droneData.status = 'waiting';
        if (!telemetryConnected && lastUpdated) lastUpdated.textContent = 'Нет соединения';
    });

    // =====================================
    // ОТРИСОВКА
    // =====================================
    function updatePosition() {
        if (!droneData.hasTelemetry) return;
        const target = worldToScreen(droneData.x, droneData.z);

        if (reducedMotion) {
            drawX = target.x;
            drawY = target.y;
        } else {
            drawX += (target.x - drawX) * SMOOTHING;
            drawY += (target.y - drawY) * SMOOTHING;
        }

        targetHeading = droneData.heading * Math.PI / 180;
        let difference = targetHeading - drawHeading;
        while (difference > Math.PI) difference -= Math.PI * 2;
        while (difference < -Math.PI) difference += Math.PI * 2;
        drawHeading += difference * TURN_SMOOTHING;
    }

    function drawRoute() {
        if (routePoints.length < 2) return;
        ctx.save();
        ctx.beginPath();
        routePoints.forEach((point, index) => {
            const screen = worldToScreen(point.x, point.z);
            if (index === 0) ctx.moveTo(screen.x, screen.y);
            else ctx.lineTo(screen.x, screen.y);
        });
        ctx.strokeStyle = 'rgba(212, 155, 75, 0.85)';
        ctx.lineWidth = 2 / zoom; // Чтобы линия не становилась слишком толстой при зуме
        ctx.setLineDash([6, 5]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
    }

    function drawDrone() {
        const size = DRONE_SIZE;
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(drawHeading);

        if (selected) {
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(212, 155, 75, 0.15)';
            ctx.fill();
        }

        ctx.fillStyle = selected ? '#d49b4b' : '#17232c';
        ctx.strokeStyle = '#f1bd69';
        ctx.lineWidth = 2 / zoom;

        ctx.fillRect(-size, -size, size * 2, size * 2);
        ctx.strokeRect(-size, -size, size * 2, size * 2);

        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 7);
        ctx.lineTo(0, 3);
        ctx.lineTo(-8, 7);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.strokeStyle = '#d49b4b';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(-size, -size); ctx.lineTo(-size - 7, -size - 7);
        ctx.moveTo(size, -size); ctx.lineTo(size + 7, -size - 7);
        ctx.moveTo(-size, size); ctx.lineTo(-size - 7, size + 7);
        ctx.moveTo(size, size); ctx.lineTo(size + 7, size + 7);
        ctx.stroke();
        ctx.restore();

        // Подпись (масштабируем шрифт обратно, чтобы он всегда был читаемым)
        ctx.save();
        ctx.fillStyle = '#edf2f5';
        ctx.font = `${12 / zoom}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(droneData.id, drawX, drawY + (27 / zoom));
        ctx.restore();
    }

    function draw() {
        // 1. Очистка
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 2. Применяем трансформации (Панорама и Зум)
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // 3. Рисуем фоновую карту прямо на канвасе (идеальная синхронизация!)
        if (mapImage && mapImage.complete && mapImage.naturalWidth !== 0) {
            ctx.drawImage(mapImage, 0, 0, canvasWidth, canvasHeight);
        } else {
            // Заглушка, если картинки нет
            ctx.fillStyle = '#0f1720';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // 4. Рисуем объекты
        updatePosition();
        drawRoute();
        if (droneData.hasTelemetry) drawDrone();

        // 5. Сбрасываем трансформации
        ctx.restore();
    }

    function animate() {
        draw();
        if (!reducedMotion) animationFrame = requestAnimationFrame(animate);
    }

    // =====================================
    // ВЗАИМОДЕЙСТВИЕ С ДРОНОМ (С УЧЕТОМ ЗУМА И ПАНА)
    // =====================================
    canvas.addEventListener('click', (event) => {
        if (!droneData.hasTelemetry) return;
        const rect = canvas.getBoundingClientRect();

        // Обратная трансформация координат мыши!
        const mouseX = (event.clientX - rect.left - panX) / zoom;
        const mouseY = (event.clientY - rect.top - panY) / zoom;

        const distance = Math.hypot(mouseX - drawX, mouseY - drawY);

        if (distance <= DRONE_SIZE + 12) {
            openDroneInfo();
        } else {
            closeInfo();
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (!droneData.hasTelemetry) {
            canvas.classList.remove('drone-hover');
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - panX) / zoom;
        const mouseY = (event.clientY - rect.top - panY) / zoom;
        const distance = Math.hypot(mouseX - drawX, mouseY - drawY);
        canvas.classList.toggle('drone-hover', distance < 25);
    });

    // =====================================
    // ИНТЕРФЕЙС ДРОНА
    // =====================================
    function updateDroneInfo() {
        if (!droneInfo || !droneData.hasTelemetry) return;
        const battery = Math.max(0, Math.min(100, Math.round(droneData.battery)));
        const statusText = droneData.status === 'active' ? 'В ПОЛЁТЕ' : 'ОЖИДАНИЕ';

        if (infoTitle) infoTitle.textContent = 'Информация о БПЛА';
        if (infoName) infoName.textContent = droneData.name;
        if (infoId) infoId.textContent = 'ID: ' + droneData.id;
        if (infoStatus) infoStatus.textContent = statusText;
        if (infoBattery) infoBattery.textContent = battery + '%';

        if (batteryLevel) {
            batteryLevel.style.width = battery + '%';
            batteryLevel.classList.toggle('warning', battery <= 50);
            batteryLevel.classList.toggle('danger', battery <= 20);
        }
        if (infoCoordX) infoCoordX.textContent = droneData.x.toFixed(2);
        if (infoCoordZ) infoCoordZ.textContent = droneData.z.toFixed(2);
    }

    function openDroneInfo() {
        selected = true;
        updateDroneInfo();
        if (droneInfo) droneInfo.setAttribute('aria-hidden', 'false');
        draw();
    }

    function closeInfo() {
        selected = false;
        if (droneInfo) droneInfo.setAttribute('aria-hidden', 'true');
        draw();
    }

    closeDroneInfo?.addEventListener('click', closeInfo);

    // =====================================
    // ЗАПУСК
    // =====================================
    // Ждем загрузки картинки перед первым рендером
    if (mapImage) {
        if (mapImage.complete) {
            resizeCanvas();
            if (!reducedMotion) animate();
        } else {
            mapImage.onload = () => {
                resizeCanvas();
                if (!reducedMotion) animate();
            };
        }
    } else {
        resizeCanvas();
        if (!reducedMotion) animate();
    }

    window.addEventListener('pagehide', () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
    });

})();