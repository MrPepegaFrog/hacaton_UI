
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
        id: "INC-1005",
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


function renderIncidents() {

    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const type = typeFilter.value;
    const drone = droneFilter.value;
    const date = dateFilter.value;

    const filtered = incidents.filter(item => {

        const searchable = Object.values(item)
            .join(" ")
            .toLowerCase();

        const itemDate = item.date.slice(0, 10);

        return searchable.includes(query)
            && (!status || item.status === status)
            && (!type || item.type === type)
            && (!drone || item.drone === drone)
            && (!date || itemDate === date);
    });

    tableBody.innerHTML = "";

    filtered.forEach(item => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.id}</td>

            <td>
                <span class="status ${getStatusClass(item.status)}">
                    ${item.status}
                </span>
            </td>

            <td>
                <span class="incident-type ${item.type === "Пожар" ? "type-fire" : "type-smoke"}">
                    ${item.type === "Пожар" ? "Пожар" : "Дым"}
                </span>
            </td>

            <td>
                ${new Date(item.date).toLocaleString("ru-RU")}
            </td>

            <td>
                <span class="ai-score ${item.ai >= 85 ? "ai-high" : item.ai >= 70 ? "ai-medium" : "ai-low"}">
                    ${item.ai}%
                </span>
            </td>

            <td>${item.drone}</td>

            <td>${item.extinguisher ?? "—"}</td>

            <td>
                ${item.latitude.toFixed(4)},
                ${item.longitude.toFixed(4)}
            </td>

            <td>${item.area.toFixed(2)}</td>
        `;

        tableBody.appendChild(row);
    });

    emptyState.hidden = filtered.length !== 0;
}


searchInput.addEventListener("input", renderIncidents);
statusFilter.addEventListener("change", renderIncidents);
typeFilter.addEventListener("change", renderIncidents);
droneFilter.addEventListener("change", renderIncidents);
dateFilter.addEventListener("change", renderIncidents);


refreshBtn.addEventListener("click", () => {

    searchInput.value = "";
    statusFilter.value = "";
    typeFilter.value = "";
    droneFilter.value = "";
    dateFilter.value = "";

    renderIncidents();

    lastUpdated.textContent =
        new Date().toLocaleTimeString("ru-RU");
});


exportBtn.addEventListener("click", () => {

    const header = [
        "ID",
        "Статус",
        "Тип",
        "Обнаружен",
        "AI",
        "Борт",
        "Тушитель",
        "Координаты",
        "ГА"
    ];

    const visibleRows = [
        ...tableBody.querySelectorAll("tr")
    ].map(row => {

        return [...row.children]
            .map(cell =>
                `"${cell.innerText.replaceAll('"', '""')}"`
            )
            .join(";");
    });

    const csv = "\uFEFF" +
        [header.join(";"), ...visibleRows].join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "journal-incidents.csv";
    link.click();

    URL.revokeObjectURL(url);
});

renderIncidents();

console.log("Журнал инцидентов загружен!");
