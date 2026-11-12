
(() => {
    'use strict';

    // =====================================
    // НАСТРОЙКИ
    // =====================================

    const DRONE_SIZE = 18;

    // Координаты Unity
    const MAP_BOUNDS = {
        minX: 0,
        maxX: 1,
        minZ: 0,
        maxZ: 1
    };

    const SMOOTHING = 0.045;
    const TURN_SMOOTHING = 0.08;

    const MAX_ROUTE_POINTS = 500;

    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 5;
    const ZOOM_STEP = 1.2;

    // Настройки следования за дроном
    const FOLLOW_MARGIN = 0.22;
    const FOLLOW_SPEED = 0.12;

    // =====================================
    // DOM
    // =====================================

    const canvas = document.getElementById('mapCanvas');
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('map-image');

    if (!canvas || !mapContainer || !mapImage) {
        console.error('Не найдены элементы карты');
        return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error('Не удалось создать Canvas-контекст');
        return;
    }

    // Информация о дроне
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

    // Кнопки
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const recenterMapBtn = document.getElementById('recenterMap');

    // =====================================
    // ДАННЫЕ
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

    // =====================================
    // РАЗМЕРЫ CANVAS И КАРТЫ
    // =====================================

    let canvasWidth = 0;
    let canvasHeight = 0;
    let pixelRatio = 1;

    let mapWidth = 0;
    let mapHeight = 0;
    let mapLoaded = false;

    // =====================================
    // ПОЛОЖЕНИЕ И МАСШТАБ КАРТЫ
    // =====================================

    let zoom = 1;
    let panX = 0;
    let panY = 0;

    // =====================================
    // ПЕРЕТАСКИВАНИЕ
    // =====================================

    let isPanning = false;

    let pointerStartX = 0;
    let pointerStartY = 0;

    let startPanX = 0;
    let startPanY = 0;

    let dragMoved = false;
    let suppressClick = false;

    // После ручного перемещения ждём новую телеметрию,
    // прежде чем снова включать автоматическое следование.
    let followPaused = false;

    // =====================================
    // ПОЛОЖЕНИЕ И НАПРАВЛЕНИЕ ДРОНА
    // =====================================

    let drawX = 0;
    let drawY = 0;

    let drawHeading = 0;
    let targetHeading = 0;

    let hasMovementHeading = false;

    let selected = false;
    let animationFrame = null;

    const reducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // =====================================
    // ЗАГРУЗКА ИЗОБРАЖЕНИЯ
    // =====================================

    function calculateMapSize() {
        if (
            !mapImage.complete ||
            !mapImage.naturalWidth ||
            !mapImage.naturalHeight
        ) {
            return false;
        }

        mapWidth = mapImage.naturalWidth;
        mapHeight = mapImage.naturalHeight;

        mapLoaded = true;

        return true;
    }

    // =====================================
    // ЦЕНТРИРОВАНИЕ КАРТЫ
    // =====================================

    function centerMap() {
        if (!mapLoaded) return;

        zoom = 1;

        panX = (canvasWidth - mapWidth) / 2;
        panY = (canvasHeight - mapHeight) / 2;

        draw();
    }

    // =====================================
    // ИЗМЕНЕНИЕ РАЗМЕРА CANVAS
    // =====================================

    function resizeCanvas() {
        const rect = mapContainer.getBoundingClientRect();

        const oldWidth = canvasWidth;
        const oldHeight = canvasHeight;

        canvasWidth = Math.max(1, rect.width);
        canvasHeight = Math.max(1, rect.height);

        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(canvasWidth * pixelRatio);
        canvas.height = Math.round(canvasHeight * pixelRatio);

        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        if (mapLoaded && oldWidth > 0 && oldHeight > 0) {
            const oldCenterMapX =
                (oldWidth / 2 - panX) / zoom;

            const oldCenterMapY =
                (oldHeight / 2 - panY) / zoom;

            panX = canvasWidth / 2 - oldCenterMapX * zoom;
            panY = canvasHeight / 2 - oldCenterMapY * zoom;
        }

        if (droneData.hasTelemetry && mapLoaded) {
            updateDronePosition();
        }

        draw();
    }

    // =====================================
    // КООРДИНАТЫ UNITY -> КАРТА
    // =====================================

    function worldToMap(x, z) {
        const normalizedX =
            (x - MAP_BOUNDS.minX) /
            (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);

        const normalizedZ =
            (z - MAP_BOUNDS.minZ) /
            (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ);

        return {
            x: normalizedX * mapWidth,
            y: (1 - normalizedZ) * mapHeight
        };
    }

    // =====================================
    // ОБНОВЛЕНИЕ ПОЗИЦИИ И ПОВОРОТА ДРОНА
    // =====================================

    function updateDronePosition() {
        if (!droneData.hasTelemetry || !mapLoaded) return;

        const position = worldToMap(
            droneData.x,
            droneData.z
        );

        // Сглаживаем поворот по кратчайшему углу
        const angleDifference = Math.atan2(
            Math.sin(targetHeading - drawHeading),
            Math.cos(targetHeading - drawHeading)
        );

        if (reducedMotion) {
            drawX = position.x;
            drawY = position.y;
            drawHeading = targetHeading;
            return;
        }

        drawHeading += angleDifference * TURN_SMOOTHING;

        // Сглаживаем движение
        drawX += (position.x - drawX) * SMOOTHING;
        drawY += (position.y - drawY) * SMOOTHING;
    }

    // =====================================
    // СЛЕДОВАНИЕ КАРТЫ ЗА ДРОНОМ
    // =====================================

    function followDrone() {
        if (
            !mapLoaded ||
            !droneData.hasTelemetry ||
            isPanning ||
            followPaused
        ) {
            return;
        }

        // Текущая позиция дрона на экране
        const screenX = panX + drawX * zoom;
        const screenY = panY + drawY * zoom;

        // Безопасная зона от краёв Canvas
        const marginX = canvasWidth * FOLLOW_MARGIN;
        const marginY = canvasHeight * FOLLOW_MARGIN;

        const leftLimit = marginX;
        const rightLimit = canvasWidth - marginX;

        const topLimit = marginY;
        const bottomLimit = canvasHeight - marginY;

        // Следование по горизонтали
        if (screenX < leftLimit) {
            panX += (leftLimit - screenX) * FOLLOW_SPEED;
        } else if (screenX > rightLimit) {
            panX -= (screenX - rightLimit) * FOLLOW_SPEED;
        }

        // Следование по вертикали
        if (screenY < topLimit) {
            panY += (topLimit - screenY) * FOLLOW_SPEED;
        } else if (screenY > bottomLimit) {
            panY -= (screenY - bottomLimit) * FOLLOW_SPEED;
        }
    }

    // =====================================
    // МАСШТАБИРОВАНИЕ
    // =====================================

    function applyZoom(newZoom, focalX, focalY) {
        const oldZoom = zoom;

        zoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, newZoom)
        );

        const factor = zoom / oldZoom;

        panX = focalX - (focalX - panX) * factor;
        panY = focalY - (focalY - panY) * factor;

        draw();
    }

    function zoomAtCenter(direction) {
        const newZoom = direction > 0
            ? zoom * ZOOM_STEP
            : zoom / ZOOM_STEP;

        applyZoom(
            newZoom,
            canvasWidth / 2,
            canvasHeight / 2
        );
    }

    zoomInBtn?.addEventListener('click', () => {
        zoomAtCenter(1);
    });

    zoomOutBtn?.addEventListener('click', () => {
        zoomAtCenter(-1);
    });

    recenterMapBtn?.addEventListener('click', () => {
        followPaused = false;
        centerMap();
    });

    // =====================================
    // КОЛЁСИКО МЫШИ
    // =====================================

    mapContainer.addEventListener('wheel', event => {
        event.preventDefault();

        const rect = canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const newZoom = event.deltaY < 0
            ? zoom * ZOOM_STEP
            : zoom / ZOOM_STEP;

        applyZoom(newZoom, mouseX, mouseY);
    }, { passive: false });

    // =====================================
    // РУЧНОЕ ПЕРЕТАСКИВАНИЕ
    // =====================================

    canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;

        isPanning = true;
        dragMoved = false;
        suppressClick = false;

        pointerStartX = event.clientX;
        pointerStartY = event.clientY;

        startPanX = panX;
        startPanY = panY;

        canvas.setPointerCapture(event.pointerId);

        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', event => {
        if (!isPanning) return;

        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;

        if (
            Math.abs(deltaX) > 3 ||
            Math.abs(deltaY) > 3
        ) {
            dragMoved = true;
        }

        if (dragMoved) {
            followPaused = true;
        }

        panX = startPanX + deltaX;
        panY = startPanY + deltaY;

        draw();
    });

    function stopPanning() {
        if (!isPanning) return;

        isPanning = false;

        suppressClick = dragMoved;

        canvas.style.cursor = 'grab';
    }

    canvas.addEventListener('pointerup', stopPanning);
    canvas.addEventListener('pointercancel', stopPanning);
    canvas.addEventListener('lostpointercapture', stopPanning);

    // =====================================
    // ПОЛУЧЕНИЕ ТЕЛЕМЕТРИИ
    // =====================================

    window.addEventListener('telemetry:update', event => {
        const data = event.detail;

        if (
            !data?.position ||
            !Number.isFinite(data.position.x) ||
            !Number.isFinite(data.position.z)
        ) {
            console.warn(
                'Некорректные координаты телеметрии:',
                data
            );
            return;
        }

        const nextX = data.position.x;
        const nextZ = data.position.z;

        // Предыдущие координаты
        const deltaX = nextX - droneData.x;
        const deltaZ = nextZ - droneData.z;

        // Определяем направление по движению Unity.
        // Учитываем реальные пропорции изображения карты.
        if (
            droneData.hasTelemetry &&
            Math.hypot(deltaX, deltaZ) > 0.0001
        ) {
            const mapDeltaX = deltaX * (
                mapLoaded ? mapWidth : 1
            );

            const mapDeltaZ = deltaZ * (
                mapLoaded ? mapHeight : 1
            );

            // Стрелка изначально смотрит вверх (+Z).
            targetHeading = Math.atan2(
                mapDeltaX,
                mapDeltaZ
            );

            if (!hasMovementHeading) {
                drawHeading = targetHeading;
                hasMovementHeading = true;
            }
        } else if (
            !droneData.hasTelemetry &&
            Number.isFinite(data.heading)
        ) {
            // Начальное направление из Unity
            targetHeading = data.heading * Math.PI / 180;
            drawHeading = targetHeading;
        }

        droneData.x = nextX;
        droneData.z = nextZ;

        // Имя и ID
        if (data.droneId !== undefined && data.droneId !== null) {
            droneData.id = String(data.droneId);
        }

        if (data.droneName !== undefined && data.droneName !== null) {
            droneData.name = String(data.droneName);
        } else if (droneData.name === '—') {
            droneData.name = droneData.id;
        }

        // Батарея
        if (Number.isFinite(data.battery)) {
            droneData.battery = data.battery;

            if (metricBattery) {
                metricBattery.textContent = Math.round(data.battery);
            }
        }

        if (Number.isFinite(data.heading)) {
            droneData.heading = data.heading;
        }

        droneData.status = 'active';
        droneData.hasTelemetry = true;

        // После ручного перемещения ждём новую телеметрию
        // и затем снова включаем автоматическое следование.
        if (!isPanning) {
            followPaused = false;
        }

        // Сохраняем маршрут
        const lastPoint = routePoints[routePoints.length - 1];

        if (
            !lastPoint ||
            Math.hypot(
                nextX - lastPoint.x,
                nextZ - lastPoint.z
            ) > 0.01
        ) {
            routePoints.push({
                x: nextX,
                z: nextZ
            });

            if (routePoints.length > MAX_ROUTE_POINTS) {
                routePoints.shift();
            }
        }

        if (lastUpdated) {
            lastUpdated.textContent =
                new Date().toLocaleTimeString('ru-RU');
        }

        if (selected) {
            updateDroneInfo();
        }

        if (reducedMotion) {
            updateDronePosition();
            draw();
        }
    });

    // =====================================
    // СТАТУС СОЕДИНЕНИЯ
    // =====================================

    window.addEventListener('telemetry:status', event => {
        telemetryConnected = Boolean(
            event.detail?.connected
        );

        if (!telemetryConnected && !droneData.hasTelemetry) {
            droneData.status = 'waiting';
        }

        if (!telemetryConnected && lastUpdated) {
            lastUpdated.textContent = 'Нет соединения';
        }
    });

    // =====================================
    // ОТРИСОВКА МАРШРУТА
    // =====================================

    function drawRoute() {
        if (!mapLoaded || routePoints.length < 2) return;

        ctx.save();

        ctx.beginPath();

        routePoints.forEach((point, index) => {
            const position = worldToMap(
                point.x,
                point.z
            );

            if (index === 0) {
                ctx.moveTo(position.x, position.y);
            } else {
                ctx.lineTo(position.x, position.y);
            }
        });

        ctx.strokeStyle = 'rgba(212, 155, 75, 0.85)';
        ctx.lineWidth = 2 / zoom;

        ctx.setLineDash([
            6 / zoom,
            5 / zoom
        ]);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.stroke();

        ctx.restore();
    }

    // =====================================
    // ОТРИСОВКА ДРОНА
    // =====================================

    function drawDrone() {
        if (!droneData.hasTelemetry) return;

        const size = DRONE_SIZE;

        ctx.save();

        ctx.translate(drawX, drawY);

        // Поворот по направлению движения
        ctx.rotate(drawHeading);

        if (selected) {
            ctx.beginPath();

            ctx.arc(
                0,
                0,
                30,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = 'rgba(212, 155, 75, 0.15)';
            ctx.fill();
        }

        ctx.fillStyle = selected
            ? '#d49b4b'
            : '#17232c';

        ctx.strokeStyle = '#f1bd69';
        ctx.lineWidth = 2 / zoom;

        ctx.fillRect(
            -size,
            -size,
            size * 2,
            size * 2
        );

        ctx.strokeRect(
            -size,
            -size,
            size * 2,
            size * 2
        );

        // Стрелка направления
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

        // Угловые элементы
        ctx.beginPath();

        ctx.moveTo(-size, -size);
        ctx.lineTo(-size - 7, -size - 7);

        ctx.moveTo(size, -size);
        ctx.lineTo(size + 7, -size - 7);

        ctx.moveTo(-size, size);
        ctx.lineTo(-size - 7, size + 7);

        ctx.moveTo(size, size);
        ctx.lineTo(size + 7, size + 7);

        ctx.stroke();

        ctx.restore();

        // Подпись
        ctx.save();

        ctx.fillStyle = '#edf2f5';
        ctx.font = `${12 / zoom}px Arial, sans-serif`;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        ctx.fillText(
            droneData.id,
            drawX,
            drawY + 27 / zoom
        );

        ctx.restore();
    }

    // =====================================
    // ОСНОВНАЯ ОТРИСОВКА
    // =====================================

    function draw() {
        ctx.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );

        ctx.clearRect(
            0,
            0,
            canvasWidth,
            canvasHeight
        );

        if (!mapLoaded) {
            ctx.fillStyle = '#0f1720';

            ctx.fillRect(
                0,
                0,
                canvasWidth,
                canvasHeight
            );

            return;
        }

        // Сначала обновляем положение дрона
        updateDronePosition();

        // Затем перемещаем карту вслед за ним
        followDrone();

        ctx.save();

        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // Изображение сохраняет исходный размер
        ctx.drawImage(
            mapImage,
            0,
            0,
            mapWidth,
            mapHeight
        );

        // Маршрут
        drawRoute();

        // Дрон
        if (droneData.hasTelemetry) {
            drawDrone();
        }

        ctx.restore();
    }

    // =====================================
    // КООРДИНАТЫ КУРСОРА НА КАРТЕ
    // =====================================

    function getPointerMapPosition(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (
                event.clientX -
                rect.left -
                panX
            ) / zoom,

            y: (
                event.clientY -
                rect.top -
                panY
            ) / zoom
        };
    }

    // =====================================
    // ВЫБОР ДРОНА НА КАРТЕ
    // =====================================

    canvas.addEventListener('click', event => {
        if (suppressClick) {
            suppressClick = false;
            return;
        }

        if (!droneData.hasTelemetry) return;

        const mouse = getPointerMapPosition(event);

        const distance = Math.hypot(
            mouse.x - drawX,
            mouse.y - drawY
        );

        if (distance <= DRONE_SIZE + 12 / zoom) {
            openDroneInfo();
        } else {
            closeInfo();
        }
    });

    // Курсор при наведении на дрон
    canvas.addEventListener('pointermove', event => {
        if (isPanning || !droneData.hasTelemetry) return;

        const mouse = getPointerMapPosition(event);

        const distance = Math.hypot(
            mouse.x - drawX,
            mouse.y - drawY
        );

        canvas.classList.toggle(
            'drone-hover',
            distance <= DRONE_SIZE + 12 / zoom
        );
    });

    // =====================================
    // КАРТОЧКА ИНФОРМАЦИИ О ДРОНЕ
    // =====================================

    function updateDroneInfo() {
        if (!droneInfo || !droneData.hasTelemetry) return;

        const battery = Math.max(
            0,
            Math.min(100, Math.round(droneData.battery))
        );

        if (infoTitle) {
            infoTitle.textContent = 'Информация о БПЛА';
        }

        if (infoName) {
            infoName.textContent = droneData.name;
        }

        if (infoId) {
            infoId.textContent = `ID: ${droneData.id}`;
        }

        if (infoStatus) {
            infoStatus.textContent =
                droneData.status === 'active'
                    ? 'В ПОЛЁТЕ'
                    : 'ОЖИДАНИЕ';
        }

        if (infoBattery) {
            infoBattery.textContent = `${battery}%`;
        }

        if (batteryLevel) {
            batteryLevel.style.width = `${battery}%`;

            batteryLevel.classList.toggle(
                'warning',
                battery <= 50
            );

            batteryLevel.classList.toggle(
                'danger',
                battery <= 20
            );
        }

        if (infoCoordX) {
            infoCoordX.textContent = droneData.x.toFixed(2);
        }

        if (infoCoordZ) {
            infoCoordZ.textContent = droneData.z.toFixed(2);
        }
    }

    function openDroneInfo() {
        selected = true;

        updateDroneInfo();

        if (droneInfo) {
            droneInfo.setAttribute('aria-hidden', 'false');
        }

        draw();
    }

    function closeInfo() {
        selected = false;

        if (droneInfo) {
            droneInfo.setAttribute('aria-hidden', 'true');
        }

        draw();
    }

    closeDroneInfo?.addEventListener('click', closeInfo);

    // =====================================
    // СОБЫТИЯ ИЗОБРАЖЕНИЯ
    // =====================================

    mapImage.addEventListener('load', () => {
        const oldWidth = mapWidth;
        const oldHeight = mapHeight;

        if (!calculateMapSize()) return;

        if (
            oldWidth !== mapWidth ||
            oldHeight !== mapHeight
        ) {
            centerMap();
        } else {
            draw();
        }
    });

    mapImage.addEventListener('error', () => {
        console.error(
            'Не удалось загрузить изображение карты'
        );
    });

    // =====================================
    // ИЗМЕНЕНИЕ РАЗМЕРА ОКНА
    // =====================================

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(
            resizeCanvas
        );

        resizeObserver.observe(mapContainer);
    } else {
        window.addEventListener('resize', resizeCanvas);
    }

    // =====================================
    // АНИМАЦИЯ
    // =====================================

    function animate() {
        draw();

        animationFrame = requestAnimationFrame(animate);
    }

    // =====================================
    // ИНИЦИАЛИЗАЦИЯ
    // =====================================

    resizeCanvas();

    if (calculateMapSize()) {
        centerMap();
    }

    if (!reducedMotion) {
        animate();
    }

    canvas.style.cursor = 'grab';

    window.addEventListener('pagehide', () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    });

    console.log('Карта инициализирована');

})();
