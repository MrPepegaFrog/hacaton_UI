
const DRONE_SIZE = 36;
const MAP_BOUNDS = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
const SMOOTHING = 0.04;        
const TURN_SMOOTHING = 0.08;   
const MIN_SPEED = 0.3;         


let droneData = {
    id: 'drone1',
    name: 'DJI Mavic 3',
    x: 0, z: 0,
    battery: 75,
    status: 'active'
};

const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let drawX = 0, drawY = 0;
let drawHeading = 0;
let targetHeading = 0;
let selected = false;

function applyDroneData(data) {
    if (Array.isArray(data)) data = data[0];
    if (!data) return;
    for (const key in data) {
        droneData[key] = data[key];
    }
}

function worldToScreen(x, z) {
    return {
        x: ((x - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX)) * canvas.width,
        y: ((z - MAP_BOUNDS.minZ) / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)) * canvas.height,
    };
}

function drawDrone() {
    const half = DRONE_SIZE / 2;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(drawHeading * Math.PI / 180);

    // квадрат
    ctx.fillStyle = selected ? '#12351f' : '#030303';
    ctx.strokeStyle = selected ? '#4CAF50' : '#ffffff';
    ctx.lineWidth = 3;
    ctx.fillRect(-half, -half, DRONE_SIZE, DRONE_SIZE);
    ctx.strokeRect(-half, -half, DRONE_SIZE, DRONE_SIZE);

    // нос-стрелка
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 6);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fillStyle = '#4CAF50';
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = '#a9d8ff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(droneData.name, drawX, drawY + half + 16);
}


function updatePosition() {
    const target = worldToScreen(droneData.x, droneData.z);
    const prevX = drawX, prevY = drawY;

    drawX += (target.x - drawX) * SMOOTHING;
    drawY += (target.y - drawY) * SMOOTHING;

    const vx = drawX - prevX;
    const vy = drawY - prevY;
    const speed = Math.hypot(vx, vy);

    if (speed > MIN_SPEED) {
        targetHeading = Math.atan2(vx, -vy) * 180 / Math.PI;
    }

    let dh = targetHeading - drawHeading;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    drawHeading += dh * TURN_SMOOTHING;
}

function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePosition();
    drawDrone();
    requestAnimationFrame(tick);
}

const initial = worldToScreen(droneData.x, droneData.z);
drawX = initial.x;
drawY = initial.y;
drawHeading = 0;
tick();


canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const half = DRONE_SIZE / 2 + 6;

    if (Math.abs(mx - drawX) <= half && Math.abs(my - drawY) <= half) {
        selected = true;
        document.getElementById('droneInfo').classList.add('active');
        document.getElementById('infoTitle').textContent = droneData.name;
        document.getElementById('infoBattery').textContent = droneData.battery + '%';
        document.getElementById('batteryLevel').style.width = droneData.battery + '%';
    } else {
        selected = false;
        document.getElementById('droneInfo').classList.remove('active');
    }
});

document.getElementById('closeDroneInfo').addEventListener('click', () => {
    selected = false;
    document.getElementById('droneInfo').classList.remove('active');
});


let t = 0;
function updateMockData() {
    t += 0.02;
    applyDroneData({
        x: Math.sin(t) * 70,          
        z: Math.sin(t * 2) * 40,       
        battery: 75 - (t % 60) * 0.3,  
    });
}
setInterval(updateMockData, 50);  