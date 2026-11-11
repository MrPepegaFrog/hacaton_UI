
/* =========================================
   WILDFIRE OPS — MAP CONTROLLER
   ========================================= */

(() => {
    'use strict';

    const DRONE_SIZE = 18;

    const MAP_BOUNDS = {
        minX: -100,
        maxX: 100,
        minZ: -100,
        maxZ: 100
    };

    const SMOOTHING = 0.045;
    const TURN_SMOOTHING = 0.08;

    const canvas = document.getElementById('mapCanvas');
    const mapContainer = document.getElementById('mapContainer');

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

    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const recenterMap = document.getElementById('recenterMap');

    const metricBattery = document.getElementById('metricBattery');
    const lastUpdated = document.getElementById('lastUpdated');

    // Данные беспилотника
    const droneData = {
        id: 'UAV-01',
        name: 'DJI Mavic 3',
        model: 'DJI Mavic 3',
        x: 0,
        z: 0,
        battery: 100,
        status: 'active',
        heading: 0
    };

    let canvasWidth = 0;
    let canvasHeight = 0;
    let pixelRatio = 1;

    let drawX = 0;
    let drawY = 0;
    let drawHeading = 0;
    let targetHeading = 0;

    let selected = false;
    let zoom = 1;
    let animationFrame = null;
    let mockTimer = null;
    let time = 0;

    const reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* =====================================
       CANVAS RESIZE
       ===================================== */

    function resizeCanvas() {
        const rect = mapContainer.getBoundingClientRect();

        canvasWidth = Math.max(1, rect.width);
        canvasHeight = Math.max(1, rect.height);

        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(canvasWidth * pixelRatio);
        canvas.height = Math.round(canvasHeight * pixelRatio);

        ctx.setTransform(
            pixelRatio, 0,
            0, pixelRatio,
            0, 0
        );

        if (drawX === 0 && drawY === 0) {
            const initial = worldToScreen(droneData.x, droneData.z);
            drawX = initial.x;
            drawY = initial.y;
        }
    }

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(mapContainer);
    } else {
        window.addEventListener('resize', resizeCanvas);
    }

    resizeCanvas();

    /* =====================================
       COORDINATES AND ZOOM
       ===================================== */

    function worldToScreen(x, z) {
        const normalizedX =
            (x - MAP_BOUNDS.minX) /
            (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);

        const normalizedZ =
            (z - MAP_BOUNDS.minZ) /
            (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ);

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        return {
            x: centerX + (normalizedX * canvasWidth - centerX) * zoom,
            y: centerY + (normalizedZ * canvasHeight - centerY) * zoom
        };
    }

    function setZoom(value) {
        zoom = Math.max(1, Math.min(2.5, value));
        draw();
    }

    zoomIn?.addEventListener('click', () => {
        setZoom(zoom + 0.2);
    });

    zoomOut?.addEventListener('click', () => {
        setZoom(zoom - 0.2);
    });

    recenterMap?.addEventListener('click', () => {
        zoom = 1;
        droneData.x = 0;
        droneData.z = 0;

        drawX = canvasWidth / 2;
        drawY = canvasHeight / 2;

        draw();
    });

    /* =====================================
       DRONE POSITION
       ===================================== */

    function updatePosition() {
        const target = worldToScreen(droneData.x, droneData.z);

        const previousX = drawX;
        const previousY = drawY;

        if (reducedMotion) {
            drawX = target.x;
            drawY = target.y;
        } else {
            drawX += (target.x - drawX) * SMOOTHING;
            drawY += (target.y - drawY) * SMOOTHING;
        }

        const velocityX = drawX - previousX;
        const velocityY = drawY - previousY;

        if (Math.hypot(velocityX, velocityY) > 0.1) {
            targetHeading =
                Math.atan2(velocityX, -velocityY);
        }

        let difference = targetHeading - drawHeading;

        while (difference > Math.PI) {
            difference -= Math.PI * 2;
        }

        while (difference < -Math.PI) {
            difference += Math.PI * 2;
        }

        drawHeading += difference * TURN_SMOOTHING;
    }

    /* =====================================
       DRAW DRONE
       ===================================== */

    function drawDrone() {
        const size = DRONE_SIZE;

        ctx.save();

        ctx.translate(drawX, drawY);
        ctx.rotate(drawHeading);

        // Свечение выбранного аппарата
        if (selected) {
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(212, 155, 75, 0.15)';
            ctx.fill();
        }

        // Корпус
        ctx.fillStyle = selected ? '#d49b4b' : '#17232c';
        ctx.strokeStyle = '#f1bd69';
        ctx.lineWidth = 2;

        ctx.fillRect(-size, -size, size * 2, size * 2);
        ctx.strokeRect(-size, -size, size * 2, size * 2);

        // Направление полёта
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 7);
        ctx.lineTo(0, 3);
        ctx.lineTo(-8, 7);
        ctx.closePath();

        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Лучи корпуса
        ctx.strokeStyle = '#d49b4b';
        ctx.lineWidth = 2;

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
        ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        ctx.fillText(
            droneData.id,
            drawX,
            drawY + 27
        );

        ctx.restore();
    }

    /* =====================================
       UPDATE DRONE INFORMATION
       ===================================== */

    function updateDroneInfo() {
        if (!droneInfo) return;

        const battery = Math.max(
            0,
            Math.min(100, Math.round(droneData.battery))
        );

        const statusText = droneData.status === 'active'
            ? 'В ПОЛЁТЕ'
            : 'НА БАЗЕ';

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

        if (infoCoordX) {
            infoCoordX.textContent = droneData.x.toFixed(1);
        }

        if (infoCoordZ) {
            infoCoordZ.textContent = droneData.z.toFixed(1);
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

    /* =====================================
       CANVAS CLICK
       ===================================== */

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const hitRadius = DRONE_SIZE + 12;

        const distance = Math.hypot(
            mouseX - drawX,
            mouseY - drawY
        );

        if (distance <= hitRadius) {
            openDroneInfo();
        } else {
            closeInfo();
        }
    });
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const { x, y } = worldToScreen(droneData.x, droneData.z);

        const distance = Math.hypot(mouseX - x, mouseY - y);

        canvas.classList.toggle('drone-hover', distance < 25);
    });

    /* =====================================
       MAP DRAWING
       ===================================== */

    function draw() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        updatePosition();
        drawDrone();
    }

    function animate() {
        draw();

        if (!reducedMotion) {
            animationFrame = requestAnimationFrame(animate);
        }
    }

    /* =====================================
       DEMO TELEMETRY
       ===================================== */

    function updateMockData() {
        time += 0.02;

        droneData.x = Math.sin(time) * 70;
        droneData.z = Math.sin(time * 2) * 40;

        droneData.battery = Math.max(
            10,
            75 - (time % 60) * 0.3
        );

        if (metricBattery) {
            metricBattery.textContent =
                Math.round(droneData.battery);
        }

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
    }

    /* =====================================
       START
       ===================================== */

    drawX = canvasWidth / 2;
    drawY = canvasHeight / 2;

    if (reducedMotion) {
        draw();
    } else {
        animate();
    }

    mockTimer = window.setInterval(updateMockData, 100);

    // Очистка при выгрузке страницы
    window.addEventListener('pagehide', () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        if (mockTimer) {
            clearInterval(mockTimer);
        }
    });

})();
