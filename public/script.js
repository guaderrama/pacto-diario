document.addEventListener('DOMContentLoaded', () => {

    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAKN4iRtxYX1rqaVCx85N7rITvWZ2FxXkg",
        authDomain: "pacto-diario.firebaseapp.com",
        projectId: "pacto-diario",
        storageBucket: "pacto-diario.appspot.com",
        messagingSenderId: "362843130137",
        appId: "1:362843130137:web:9d55d785791f8b5879dd88"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    // --- Inicialización de Firebase ---
    const auth = firebase.auth();
    const db = firebase.firestore(); // Initialize Firestore

    // --- CONFIGURACIÓN DEL EMULADOR ---
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        console.log("Estamos en desarrollo. Usando emuladores de Firebase...");
        auth.useEmulator('http://127.0.0.1:9099');
        db.useEmulator('127.0.0.1', 8080); // Use Firestore emulator
    }

    // ---  Declaración de Elementos del DOM ---
    const appView = document.getElementById('app-view');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const homeView = document.getElementById('home-view');
    const santuarioView = document.getElementById('sanctuary-view');
    const profileView = document.getElementById('profile-view');
    const appViews = [homeView, santuarioView, profileView];

    // Formularios y Errores
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const profileForm = document.getElementById('profile-form');
    const loginErrorP = document.getElementById('login-error');
    const registerErrorP = document.getElementById('register-error');
    const profileSaveMessage = document.getElementById('profile-save-message');

    // Inputs
    const userNameDisplay = document.getElementById('user-name');
    const profileNameInput = document.getElementById('profile-name');
    const profilePartnerNameInput = document.getElementById('profile-partner-name');
    const userLoveLanguageSelect = document.getElementById('user-love-language');
    const partnerLoveLanguageSelect = document.getElementById('partner-love-language');

    // Botones y Enlaces
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const generarGuiaBtn = document.getElementById('generar-guia-btn');
    const navHomeBtn = document.getElementById('nav-home-btn');
    const navProfileBtn = document.getElementById('nav-profile-btn');
    const getDailyJourneyBtn = document.getElementById('get-daily-journey-btn');

    // --- Mobile Menu Elements ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const navHomeBtnMobile = document.getElementById('nav-home-btn-mobile');
    const navProfileBtnMobile = document.getElementById('nav-profile-btn-mobile');
    const logoutBtnMobile = document.getElementById('logout-btn-mobile');

    // Áreas de Contenido
    const logosInput = document.getElementById('logos-input');
    const logosResponse = document.getElementById('logos-response');
    const dailyJourneyContent = document.getElementById('daily-journey-content');

    // --- Lógica de Navegación --- //
    function showAppView(viewToShow) {
        appViews.forEach(view => view.classList.add('hidden'));
        if (viewToShow) {
            viewToShow.classList.remove('hidden');
        }
        if (viewToShow === homeView) {
            santuarioView.classList.remove('hidden');
        } else {
            santuarioView.classList.add('hidden');
        }
        // Close mobile menu on navigation
        mobileMenu.classList.add('hidden');
    }

    // --- Lógica de Autenticación y Perfil ---
    auth.onAuthStateChanged(user => {
        if (user) {
            appView.classList.remove('hidden');
            loginView.classList.add('hidden');
            showAppView(homeView);
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    userNameDisplay.textContent = doc.data().profile.userName || user.email;
                } else {
                    userNameDisplay.textContent = user.email;
                }
            }).catch(error => {
                console.error("Error getting user profile for display:", error);
                userNameDisplay.textContent = user.email;
            });
        } else {
            appView.classList.add('hidden');
            loginView.classList.remove('hidden');
            registerView.classList.add('hidden');
        }
    });

    showRegisterBtn.addEventListener('click', e => { e.preventDefault(); loginView.classList.add('hidden'); registerView.classList.remove('hidden'); });
    showLoginBtn.addEventListener('click', e => { e.preventDefault(); registerView.classList.add('hidden'); loginView.classList.remove('hidden'); });

    registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        auth.createUserWithEmailAndPassword(email, password).catch(error => { registerErrorP.textContent = error.message; });
    });

    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        if (!email.includes('@') || !email.includes('.')) {
            loginErrorP.textContent = "Por favor, introduce un correo electrónico válido.";
            return;
        }
        auth.signInWithEmailAndPassword(email, password).catch(error => { loginErrorP.textContent = error.message; });
    });

    logoutBtn.addEventListener('click', () => auth.signOut());
    logoutBtnMobile.addEventListener('click', () => auth.signOut()); // Mobile logout

    // Cargar y Guardar Perfil
    async function getAuthToken() {
        const user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    }

    const functionsBaseUrl = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? 'http://127.0.0.1:5001/pacto-diario/us-central1'
        : 'https://us-central1-pacto-diario.cloudfunctions.net';

    async function loadUserProfile() {
        const token = await getAuthToken();
        if (!token) return;
        fetch(`${functionsBaseUrl}/getUserProfile`, { 
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(res => res.json())
        .then(data => {
            if (data.profile) {
                profileNameInput.value = data.profile.userName || '';
                profilePartnerNameInput.value = data.profile.partnerName || '';
                userLoveLanguageSelect.value = data.profile.userLoveLanguage || '';
                partnerLoveLanguageSelect.value = data.profile.partnerLoveLanguage || '';
            }
        })
        .catch(err => console.error('Error al cargar perfil:', err));
    }

    profileForm.addEventListener('submit', async e => {
        e.preventDefault();
        const token = await getAuthToken();
        if (!token) return;
        const userName = profileNameInput.value;
        const partnerName = profilePartnerNameInput.value;
        const userLoveLanguage = userLoveLanguageSelect.value;
        const partnerLoveLanguage = partnerLoveLanguageSelect.value;
        profileSaveMessage.textContent = 'Guardando...';
        fetch(`${functionsBaseUrl}/setUserProfile`, { 
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName, partnerName, userLoveLanguage, partnerLoveLanguage })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            profileSaveMessage.textContent = data.message;
            setTimeout(() => profileSaveMessage.textContent = '', 3000);
            userNameDisplay.textContent = userName;
        })
        .catch(err => profileSaveMessage.textContent = `Error: ${err.message}`);
    });

    // --- Lógica de la Aplicación Principal ---
    hamburgerBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    navHomeBtn.addEventListener('click', e => { e.preventDefault(); showAppView(homeView); });
    navProfileBtn.addEventListener('click', e => { e.preventDefault(); loadUserProfile(); showAppView(profileView); });

    navHomeBtnMobile.addEventListener('click', e => { e.preventDefault(); showAppView(homeView); });
    navProfileBtnMobile.addEventListener('click', e => { e.preventDefault(); loadUserProfile(); showAppView(profileView); });

    getDailyJourneyBtn.addEventListener('click', () => setDailyContent());

    generarGuiaBtn.addEventListener('click', () => {
        const userTopic = logosInput.value;
        if (userTopic.trim() === '') { logosResponse.innerHTML = `<p class="text-red-500">Por favor, escribe un tema.</p>`; return; }
        logosResponse.innerHTML = `<p class="text-center p-4">Conectando con Logos...</p>`;
        fetch(`${functionsBaseUrl}/generateLogosResponse`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ topic: userTopic }) 
        })
            .then(async response => {
                const data = await response.json();
                if (!data || typeof data !== 'object' || data.error) {
                    throw new Error(data.error || 'Invalid response from Logos API.');
                }
                if (!data.story || !data.keyword || !data.fact || !data.prayer) {
                    throw new Error('Incomplete data from Logos API.');
                }
                const imageUrl = `https://picsum.photos/480/218?random=1&keywords=${data.keyword},bible,art`;
                logosResponse.innerHTML = `
                    <div class="p-4">
                        <div class="bg-cover bg-center flex flex-col items-stretch justify-end rounded-lg pt-[132px]" style="background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), url('${imageUrl}');">
                            <div class="flex w-full items-end justify-between gap-4 p-4">
                                <p class="text-white tracking-light text-2xl font-bold leading-tight max-w-[440px]">
                                    ${typeof data.story === 'string' && data.story.length > 0 ? data.story.split('.')[0] : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                    <h2 class="text-gray-100 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Historia Bíblica</h2>
                    <p class="text-gray-200 text-base font-normal leading-normal pb-3 pt-1 px-4">${data.story}</p>
                    <h2 class="text-gray-100 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Dato Teológico</h2>
                    <p class="text-gray-200 text-base font-normal leading-normal pb-3 pt-1 px-4">${data.fact}</p>
                    <h2 class="text-gray-100 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-1 px-4">Oración Personalizada</h2>
                    <p class="text-gray-200 text-base font-normal leading-normal pb-3 pt-1 px-4">${data.prayer}</p>
                `;
            })
            .catch(error => { logosResponse.innerHTML = `<p class="text-red-500 p-4">Error: No se pudo obtener la guía. ${error.message}</p>`; });
    });

    async function setDailyContent() {
        dailyJourneyContent.innerHTML = `<p class="text-center p-4">Buscando la inspiración de hoy...</p>`;
        const token = await getAuthToken();
        if (!token) {
            dailyJourneyContent.innerHTML = `<p class="text-red-500 p-4">Error: Debes iniciar sesión para ver esto.</p>`;
            return;
        }
        fetch(`${functionsBaseUrl}/getDailyJourneyContent`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(async response => {
            const data = await response.json();
            if (!data || typeof data !== 'object' || data.error) {
                throw new Error(data.error || 'Invalid response from Daily Journey API.');
            }
            if (!data.title || !data.content) {
                throw new Error('Incomplete data from Daily Journey API.');
            }
            const day = new Date().getDay();
            let themeKeyword = 'couple,faith';
            switch (day) {
                case 0: case 6: themeKeyword = 'couple,laughing,fun'; break;
                case 1: themeKeyword = 'couple,praying,spiritual'; break;
                case 2: themeKeyword = 'couple,helping,service'; break;
                case 3: themeKeyword = 'couple,growth,nature'; break;
                case 4: themeKeyword = 'couple,commitment,holding,hands'; break;
                case 5: themeKeyword = 'couple,talking,communication'; break;
            }
            const imageUrl = `https://picsum.photos/480/218?random=2&keywords=${themeKeyword}`;
            dailyJourneyContent.innerHTML = `
                <img src="${imageUrl}" alt="Imagen del día" class="w-full h-auto rounded-lg mb-4 shadow-md">
                <h1 class="text-gray-100 text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 text-left pb-3 pt-5">${data.title}</h1>
                <p class="text-gray-200 text-base font-normal leading-normal pb-3 pt-1 px-4">${data.content}</p>
            `;
        })
        .catch(error => { dailyJourneyContent.innerHTML = `<p class="text-red-500 p-4">Error: No se pudo obtener el contenido de hoy. ${error.message}</p>`; });
    }

    // Dark mode toggle logic
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const htmlElement = document.documentElement;

    function enableDarkMode() {
        htmlElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }

    function disableDarkMode() {
        htmlElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else if (savedTheme === 'light') {
        disableDarkMode();
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        enableDarkMode();
    }

    darkModeToggle.addEventListener('click', () => {
        if (htmlElement.classList.contains('dark')) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    });
});
