
const WS_BASE_URL = `ws://${SERVER_ADDRESS}/video`;


function connectWebSocket(role) {
    const url = `${WS_BASE_URL}?role=${encodeURIComponent(role)}`;

    console.log(`Подключение к потоку ${role}:`, url);

    return new WebSocket(url);
}


const droneImg = document.getElementById('drone-cam');
const detectedImg = document.getElementById('detected-cam');

const prevUrl1 = { val: null };
const prevUrl2 = { val: null };

function wireStream(role, img, urlHolder) {
    if (!img) {
        console.log(`Поток ${role} пропущен: на этой странице нет изображения`);
        return null;
    }

    const ws = connectWebSocket(role);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log(`Видеопоток ${role} подключён`);
    };

    ws.onmessage = (event) => {
        const blob = new Blob([event.data], {
            type: 'image/jpeg'
        });

        const url = URL.createObjectURL(blob);

        img.onload = () => {
            if (urlHolder.val) {
                URL.revokeObjectURL(urlHolder.val);
            }

            urlHolder.val = url;
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            console.error(`Не удалось отобразить изображение потока ${role}`);
        };

        img.src = url;
    };

    ws.onerror = (error) => {
        console.error(`Ошибка видеопотока ${role}:`, error);
    };

    ws.onclose = (event) => {
        console.warn(`Видеопоток ${role} отключён`, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });
    };

    return ws;
}

wireStream('viewer', droneImg, prevUrl1);
wireStream('detected-viewer', detectedImg, prevUrl2);


const mapImg = document.getElementById('map-image');
let mapUrl = null;
let mapWs = null;

if (mapImg) {
    mapWs = connectWebSocket('map-viewer');
    mapWs.binaryType = 'arraybuffer';

    mapWs.onopen = () => {
        console.log('Поток карты подключён');
    };

    mapWs.onmessage = (event) => {
        const blob = new Blob([event.data], {
            type: 'image/jpeg'
        });

        const url = URL.createObjectURL(blob);

        mapImg.onload = () => {
            if (mapUrl) {
                URL.revokeObjectURL(mapUrl);
            }

            mapUrl = url;
            console.log('Изображение карты получено:', mapImg.naturalWidth, 'x', mapImg.naturalHeight);
        };

        mapImg.onerror = () => {
            URL.revokeObjectURL(url);
            console.error('Не удалось отобразить изображение карты');
        };

        mapImg.src = url;
    };

    mapWs.onerror = (error) => {
        console.error('Ошибка потока карты:', error);
    };

    mapWs.onclose = (event) => {
        console.warn('Поток карты отключён:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });
    };
} else {
    console.warn('Элемент map-image не найден');
}


const telWs = connectWebSocket('telemetry-viewer');

telWs.onopen = () => {
    console.log('WILDFIRE OPS: телеметрия подключена');

    window.dispatchEvent(
        new CustomEvent('telemetry:status', {
            detail: { connected: true }
        })
    );
};

telWs.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        console.log(
            'ТЕЛЕМЕТРИЯ ОТ UNITY:',
            JSON.stringify(data, null, 4)
        );

        if (
            !data.position ||
            !Number.isFinite(data.position.x) ||
            !Number.isFinite(data.position.z)
        ) {
            console.warn('Некорректная телеметрия:', data);
            return;
        }

        window.dispatchEvent(
            new CustomEvent('telemetry:update', {
                detail: data
            })
        );

    } catch (error) {
        console.error('Ошибка обработки телеметрии:', error);
    }
};

telWs.onerror = (error) => {
    console.error('Ошибка WebSocket телеметрии:', error);
};

telWs.onclose = (event) => {
    console.warn('Соединение телеметрии закрыто:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
    });

    window.dispatchEvent(
        new CustomEvent('telemetry:status', {
            detail: { connected: false }
        })
    );
};
