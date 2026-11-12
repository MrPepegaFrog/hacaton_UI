"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const USERS_KEY = "wildfire_ops_users";

    // Измени путь, если главная страница находится в другом месте.
    const MAIN_PAGE = "../../index.html";

    const message = document.getElementById("authMessage");

    function showMessage(text, type = "error") {
        if (!message) return;

        message.textContent = text;
        message.className = `auth-message ${type}`;
    }

    function getUsers() {
        try {
            const users = JSON.parse(
                localStorage.getItem(USERS_KEY) || "[]"
            );

            return Array.isArray(users) ? users : [];
        } catch (error) {
            console.error("Ошибка чтения пользователей:", error);
            return [];
        }
    }

    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const fullName = document
                .getElementById("fullName")
                .value.trim();

            const login = document
                .getElementById("registerLogin")
                .value.trim();

            const password = document
                .getElementById("registerPassword")
                .value;

            const confirmPassword = document
                .getElementById("confirmPassword")
                .value;

            if (fullName.length < 2) {
                showMessage("Введите корректное ФИО.");
                return;
            }

            if (!/^[a-zA-Zа-яА-ЯёЁ0-9_-]{3,30}$/.test(login)) {
                showMessage(
                    "Логин должен содержать от 3 до 30 символов: буквы, цифры, _ или -."
                );
                return;
            }

            if (password.length < 8) {
                showMessage("Пароль должен содержать минимум 8 символов.");
                return;
            }

            if (password !== confirmPassword) {
                showMessage("Пароли не совпадают.");
                return;
            }

            const users = getUsers();

            const loginExists = users.some(
                user => user.login.toLowerCase() === login.toLowerCase()
            );

            if (loginExists) {
                showMessage("Пользователь с таким логином уже существует.");
                return;
            }

            const newUser = {
                fullName,
                login,
                password
            };

            try {
                users.push(newUser);

                localStorage.setItem(
                    USERS_KEY,
                    JSON.stringify(users)
                );

                showMessage(
                    "Регистрация прошла успешно! Сейчас вы перейдёте на страницу входа.",
                    "success"
                );

                registerForm.reset();

                setTimeout(() => {
                    window.location.href = "authorization.html";
                }, 1200);

            } catch (error) {
                console.error("Ошибка регистрации:", error);
                showMessage("Не удалось сохранить пользователя в браузере.");
            }
        });
    }

    // =====================================
    // АВТОРИЗАЦИЯ
    // =====================================

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const login = document
                .getElementById("login")
                .value.trim();

            const password = document
                .getElementById("password")
                .value;

            if (!login || !password) {
                showMessage("Заполните все поля.");
                return;
            }

            const users = getUsers();

            const user = users.find(
                item =>
                    item.login.toLowerCase() === login.toLowerCase() &&
                    item.password === password
            );

            if (!user) {
                showMessage("Неверный логин или пароль.");
                return;
            }

            try {
                // Демонстрационная отметка о входе.
                sessionStorage.setItem(
                    "wildfire_ops_current_user",
                    JSON.stringify({
                        fullName: user.fullName,
                        login: user.login
                    })
                );

                showMessage("Авторизация успешна. Выполняется вход...", "success");

                setTimeout(() => {
                    window.location.href = MAIN_PAGE;
                }, 700);

            } catch (error) {
                console.error("Ошибка авторизации:", error);
                showMessage("Не удалось выполнить вход.");
            }
        });
    }
});