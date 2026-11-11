
function initHeaderMenu() {
    const header = document.querySelector(".site-header");
    const menuToggle = document.getElementById("menuToggle");
    const navigation = document.getElementById("mainNavigation");

    if (!header || !menuToggle || !navigation) {
        console.error("Элементы меню не найдены");
        return;
    }

    function closeMenu() {
        header.classList.remove("menu-open");

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Открыть меню");

        document.body.style.overflow = "";
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = header.classList.toggle("menu-open");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Закрыть меню" : "Открыть меню"
        );

        document.body.style.overflow = isOpen ? "hidden" : "";
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            closeMenu();
        }
    });
}


// Сначала загружаем HTML, затем запускаем меню
fetch('/assets/layout/header.html')
    .then(response => {
        if (!response.ok) {
            throw new Error("Не удалось загрузить header.html");
        }

        return response.text();
    })
    .then(data => {
        const placeholder = document.getElementById('header-placeholder');

        if (!placeholder) {
            throw new Error("header-placeholder не найден");
        }

        placeholder.innerHTML = data;

        // Теперь элементы меню уже существуют
        initHeaderMenu();
    })
    .catch(error => {
        console.error("Ошибка загрузки шапки:", error);
    });
