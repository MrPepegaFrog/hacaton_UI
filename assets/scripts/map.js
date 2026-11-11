const drone = document.getElementById('drone1');
const droneInfo = document.getElementById('droneInfo');
const closeBtn = document.getElementById('closeDroneInfo');


drone.addEventListener('click', () => {
    droneInfo.classList.add('active');
});

closeBtn.addEventListener('click', () => {
    droneInfo.classList.remove('active');
});

document.addEventListener('click', (e) => {
    if (!droneInfo.contains(e.target) && !drone.contains(e.target)) {
        droneInfo.classList.remove('active');
    }
});