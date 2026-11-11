
"use strict";
const incidents = [
    {
        id: "INC-1003",
        status: "Потушен",
        type: "Дым",
        date: "2026-11-11T11:14:13",
        ai: 94,
        drone: "FF-04",
        extinguisher: "FF-01",
        latitude: 53.3902,
        longitude: 58.8163,
        area: 0.47
    },
    {
        id: "INC-1008",
        status: "Подтверждён",
        type: "Пожар",
        date: "2026-11-11T09:58:15",
        ai: 93,
        drone: "SC-09",
        extinguisher: null,
        latitude: 53.4420,
        longitude: 58.8378,
        area: 1.14
    },
    {
        id: "INC-1007",
        status: "Новый",
        type: "Дым",
        date: "2026-11-11T07:14:53",
        ai: 63,
        drone: "SC-08",
        extinguisher: null,
        latitude: 53.3397,
        longitude: 58.9519,
        area: 2.08
    },
    {
        id: "INC-1006",
        status: "Новый",
        type: "Пожар",
        date: "2026-11-11T05:36:37",
        ai: 87,
        drone: "FF-07",
        extinguisher: null,
        latitude: 53.3252,
        longitude: 58.8218,
        area: 1.87
    },
    {
        id: "INC-1000",
        status: "Новый",
        type: "Пожар",
        date: "2026-11-11T04:34:25",
        ai: 72,
        drone: "FF-01",
        extinguisher: null,
        latitude: 53.4287,
        longitude: 58.8601,
        area: 3.05
    },
    {
        id: "INC-1002",
        status: "Подтверждён",
        type: "Пожар",
        date: "2026-11-11T04:25:57",
        ai: 66,
        drone: "SC-03",
        extinguisher: null,
        latitude: 53.3396,
        longitude: 58.9589,
        area: 0.83
    },
    {
        id: "INC-1004",
        status: "Потушен",
        type: "Пожар",
        date: "2026-11-11T01:55:07",
        ai: 84,
        drone: "SC-05",
        extinguisher: null,
        latitude: 53.4204,
        longitude: 58.8636,
        area: 1.00
    },
    {
        id: "INC-1005",
        status: "Ложное срабатывание",
        type: "Пожар",
        date: "2026-11-11T01:48:55",
        ai: 81,
        drone: "SC-06",
        extinguisher: null,
        latitude: 53.3735,
        longitude: 58.8640,
        area: 1.20
    },
    {
        id: "INC-1009",
        status: "Ложное срабатывание",
        type: "Пожар",
        date: "2026-11-12T01:48:55",
        ai: 81,
        drone: "SC-06",
        extinguisher: null,
        latitude: 53.3735,
        longitude: 58.8640,
        area: 1.20
    }
];


const tableBody = document.querySelector("#incidentsTableBody");

const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const typeFilter = document.querySelector("#typeFilter");
const droneFilter = document.querySelector("#droneFilter");
const dateFilter = document.querySelector("#dateFilter");

const emptyState = document.querySelector("#emptyState");
const refreshBtn = document.querySelector("#refreshBtn");
const exportBtn = document.querySelector("#exportBtn");
const lastUpdated = document.querySelector("#lastUpdated");

if (
    !tableBody ||
    !searchInput ||
    !statusFilter ||
    !typeFilter ||
    !droneFilter ||
    !dateFilter ||
    !emptyState ||
    !refreshBtn ||
    !exportBtn
) {
    console.error("Не найдены необходимые элементы журнала.");
} else {

    let filteredIncidents = [];


    function createCell(value) {
        const cell = document.createElement("td");
        cell.textContent = value;
        return cell;
    }

    function getStatusClass(status) {
        switch (status) {
            case "Новый":
                return "status-new";

            case "Подтверждён":
                return "status-confirmed";

            case "Потушен":
                return "status-extinguished";

            case "Ложное срабатывание":
                return "status-false";

            default:
                return "";
        }
    }

    function getAIClass(score) {
        if (score >= 85) return "ai-high";
        if (score >= 70) return "ai-medium";

        return "ai-low";
    }

    function formatDate(date) {
        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "—";
        }

        return parsedDate.toLocaleString("ru-RU");
    }

    function updateTimestamp() {
        if (!lastUpdated) return;

        lastUpdated.textContent =
            new Date().toLocaleTimeString("ru-RU");
    }


    function createIncidentRow(item) {
        const row = document.createElement("tr");

        row.appendChild(createCell(item.id));

        // Статус
        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        statusBadge.className =
            "status " + getStatusClass(item.status);

        statusBadge.textContent = item.status;

        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        // Тип инцидента
        const typeCell = document.createElement("td");
        const typeBadge = document.createElement("span");

        typeBadge.className =
            "incident-type " +
            (item.type === "Пожар" ? "type-fire" : "type-smoke");

        typeBadge.textContent = item.type;

        typeCell.appendChild(typeBadge);
        row.appendChild(typeCell);

        // Дата
        row.appendChild(createCell(formatDate(item.date)));

        // AI
        const aiCell = document.createElement("td");
        const aiScore = document.createElement("span");

        aiScore.className =
            "ai-score " + getAIClass(item.ai);

        aiScore.textContent = item.ai + "%";

        aiCell.appendChild(aiScore);
        row.appendChild(aiCell);

        // Борт
        row.appendChild(createCell(item.drone));

        // Тушитель
        row.appendChild(
            createCell(item.extinguisher || "—")
        );

        // Координаты
        row.appendChild(
            createCell(
                item.latitude.toFixed(4) +
                ", " +
                item.longitude.toFixed(4)
            )
        );

        row.appendChild(
            createCell(item.area.toFixed(2))
        );

        return row;
    }

    function getFilteredIncidents() {
        const query = searchInput.value
            .trim()
            .toLocaleLowerCase("ru-RU");

        const status = statusFilter.value;
        const type = typeFilter.value;
        const drone = droneFilter.value;
        const date = dateFilter.value;

        return incidents.filter(function (item) {

            const searchable = [
                item.id,
                item.status,
                item.type,
                item.date,
                item.ai,
                item.drone,
                item.extinguisher || "",
                item.latitude,
                item.longitude,
                item.area
            ].join(" ").toLocaleLowerCase("ru-RU");

            const itemDate = item.date.slice(0, 10);

            return (
                searchable.includes(query) &&
                (!status || item.status === status) &&
                (!type || item.type === type) &&
                (!drone || item.drone === drone) &&
                (!date || itemDate === date)
            );
        });
    }

    function renderIncidents() {
        filteredIncidents = getFilteredIncidents();

        tableBody.textContent = "";

        const fragment = document.createDocumentFragment();

        filteredIncidents.forEach(function (item) {
            fragment.appendChild(createIncidentRow(item));
        });

        tableBody.appendChild(fragment);

        emptyState.hidden = filteredIncidents.length !== 0;

        updateTimestamp();
    }


    searchInput.addEventListener("input", renderIncidents);

    statusFilter.addEventListener("change", renderIncidents);

    typeFilter.addEventListener("change", renderIncidents);

    droneFilter.addEventListener("change", renderIncidents);

    dateFilter.addEventListener("change", renderIncidents);

    refreshBtn.addEventListener("click", function () {
        renderIncidents();
    });

    function escapeCSV(value) {
        const text = String(value == null ? "" : value);

        return '"' + text.replace(/"/g, '""') + '"';
    }

    function exportCSV() {
        const header = [
            "ID",
            "Статус",
            "Тип",
            "Обнаружен",
            "AI",
            "Борт",
            "Тушитель",
            "Широта",
            "Долгота",
            "Площадь, га"
        ];

        const rows = filteredIncidents.map(function (item) {
            return [
                item.id,
                item.status,
                item.type,
                formatDate(item.date),
                item.ai + "%",
                item.drone,
                item.extinguisher || "—",
                item.latitude.toFixed(4),
                item.longitude.toFixed(4),
                item.area.toFixed(2)
            ];
        });

        const csv = "\uFEFF" + [
            header,
            ...rows
        ].map(function (row) {
            return row.map(escapeCSV).join(";");
        }).join("\r\n");

        const blob = new Blob(
            [csv],
            { type: "text/csv;charset=utf-8;" }
        );
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, "journal-incidents.csv");
            return;
        }

        if (!window.URL || !URL.createObjectURL) {
            console.error("Экспорт файлов не поддерживается браузером.");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "journal-incidents.csv";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Не освобождаем URL до завершения скачивания
        window.setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    exportBtn.addEventListener("click", exportCSV);


    renderIncidents();

    console.log("WILDFIRE OPS: журнал инцидентов загружен.");
}
