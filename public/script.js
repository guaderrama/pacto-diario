document.addEventListener('DOMContentLoaded', () => {

    // --- Inicialización de Firebase ---
    const auth = firebase.auth();
    // NOTA: No necesitamos inicializar functions() para este nuevo método.

    // --- CONFIGURACIÓN DEL EMULADOR ---
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        console.log("Estamos en desarrollo. Usando emuladores de Firebase...");
        auth.useEmulator('http://127.0.0.1:9099');
    }

    // ---  Declaración de Elementos del DOM ---
    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('main-content');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const mainView = document.getElementById('main-view');
    const santuarioView = document.getElementById('santuario-view');
    const viajeView = document.getElementById('viaje-view');
    const profileView = document.getElementById('profile-view');
    const appViews = [mainView, santuarioView, viajeView, profileView];

    // Formularios y Errores
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const profileForm = document.getElementById('profile-form');
    const loginErrorP = document.getElementById('login-error');
    const registerErrorP = document.getElementById('register-error');
    const profileStatusP = document.getElementById('profile-status');

    // Inputs
    const userNameInput = document.getElementById('user-name');
    const partnerNameInput = document.getElementById('partner-name');

    // Botones y Enlaces
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');
    const goToSantuarioBtn = document.getElementById('santuario-btn');
    const goToViajeBtn = document.getElementById('viaje-btn');
    const santuarioBackBtn = document.getElementById('santuario-back-btn');
    const viajeBackBtn = document.getElementById('viaje-back-btn');
    const generarGuiaBtn = document.getElementById('generar-guia-btn');
    const navHomeBtn = document.getElementById('nav-home');
    const navJourneyBtn = document.getElementById('nav-journey');
    const navProfileBtn = document.getElementById('nav-profile');

    // Áreas de Contenido
    const santuarioInput = document.getElementById('santuario-input');
    const santuarioResponseArea = document.getElementById('santuario-response-area');
    const viajeContentArea = document.getElementById('viaje-content-area');

    // --- Lógica de Navegación --- //
    function showAppView(viewToShow) {
        appViews.forEach(view => view.classList.add('view-hidden'));
        if (viewToShow) viewToShow.classList.remove('view-hidden');
    }

    // --- Lógica de Autenticación y Perfil ---
    auth.onAuthStateChanged(user => {
        if (user) {
            mainContent.classList.remove('view-hidden');
            authContainer.classList.add('view-hidden');
            showAppView(mainView);
        } else {
            mainContent.classList.add('view-hidden');
            authContainer.classList.remove('view-hidden');
            loginView.classList.remove('view-hidden');
            registerView.classList.add('view-hidden');
        }
    });

    showRegisterBtn.addEventListener('click', e => { e.preventDefault(); loginView.classList.add('view-hidden'); registerView.classList.remove('view-hidden'); });
    showLoginBtn.addEventListener('click', e => { e.preventDefault(); registerView.classList.add('view-hidden'); loginView.classList.remove('view-hidden'); });

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
        auth.signInWithEmailAndPassword(email, password).catch(error => { loginErrorP.textContent = error.message; });
    });

    logoutBtn.addEventListener('click', () => auth.signOut());

    // Cargar y Guardar Perfil con FETCH y TOKEN MANUAL
    async function getAuthToken() {
        const user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    }

    async function loadUserProfile() {
        const token = await getAuthToken();
        if (!token) return;

        fetch('http://127.0.0.1:5001/pacto-diario/us-central1/getUserProfile', { 
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(res => res.json())
        .then(data => {
            if (data.profile) {
                userNameInput.value = data.profile.userName || '';
                partnerNameInput.value = data.profile.partnerName || '';
            }
        })
        .catch(err => console.error('Error al cargar perfil:', err));
    }

    profileForm.addEventListener('submit', async e => {
        e.preventDefault();
        const token = await getAuthToken();
        if (!token) return;

        const userName = userNameInput.value;
        const partnerName = partnerNameInput.value;
        profileStatusP.textContent = 'Guardando...';

        fetch('http://127.0.0.1:5001/pacto-diario/us-central1/setUserProfile', { 
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName, partnerName })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            profileStatusP.textContent = data.message;
            setTimeout(() => profileStatusP.textContent = '', 3000);
        })
        .catch(err => profileStatusP.textContent = `Error: ${err.message}`);
    });

    // --- Lógica de la Aplicación Principal ---
    goToSantuarioBtn.addEventListener('click', () => showAppView(santuarioView));
    goToViajeBtn.addEventListener('click', () => { setDailyContent(); showAppView(viajeView); });
    santuarioBackBtn.addEventListener('click', () => showAppView(mainView));
    viajeBackBtn.addEventListener('click', () => showAppView(mainView));
    navHomeBtn.addEventListener('click', e => { e.preventDefault(); showAppView(mainView); });
    navJourneyBtn.addEventListener('click', e => { e.preventDefault(); setDailyContent(); showAppView(viajeView); });
    navProfileBtn.addEventListener('click', e => { 
        e.preventDefault(); 
        loadUserProfile();
        showAppView(profileView); 
    });

    generarGuiaBtn.addEventListener('click', () => {
        const userTopic = santuarioInput.value;
        if (userTopic.trim() === '') { santuarioResponseArea.innerHTML = `<p class="text-red-500">Por favor, escribe un tema.</p>`; return; }
        santuarioResponseArea.innerHTML = `<p class="text-center p-4">Conectando con Logos...</p>`;
        fetch('https://us-central1-pacto-diario.cloudfunctions.net/generateLogosResponse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: userTopic }) })
            .then(response => response.json())
            .then(data => {
                if (data.error) throw new Error(data.error);

                const imageUrl = `https://picsum.photos/480/218?random=1&keywords=${data.keyword},bible,art`;

                santuarioResponseArea.innerHTML = `
                    <div class="p-4">
                        <div class="bg-cover bg-center flex flex-col items-stretch justify-end rounded-lg pt-[132px]" style="background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), url('${imageUrl}');">
                            <div class="flex w-full items-end justify-between gap-4 p-4">
                                <p class="text-white tracking-light text-2xl font-bold leading-tight max-w-[440px]">${data.story.split('.')[0]}</p>
                            </div>
                        </div>
                    </div>
                    <h2 class="text-[#1b0e0e] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Historia Bíblica</h2>
                    <p class="text-[#1b0e0e] text-base font-normal leading-normal pb-3 pt-1 px-4">${data.story}</p>
                    <h2 class="text-[#1b0e0e] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Dato Teológico</h2>
                    <p class="text-[#1b0e0e] text-base font-normal leading-normal pb-3 pt-1 px-4">${data.fact}</p>
                    <h2 class="text-[#1b0e0e] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Oración Personalizada</h2>
                    <p class="text-[#1b0e0e] text-base font-normal leading-normal pb-3 pt-1 px-4">${data.prayer}</p>
                `;
            })
            .catch(error => { santuarioResponseArea.innerHTML = `<p class="text-red-500 p-4">Error: No se pudo obtener la guía. ${error.message}</p>`; });
    });

    async function setDailyContent() {
        viajeContentArea.innerHTML = `<p class="text-center p-4">Buscando la inspiración de hoy...</p>`;
        const token = await getAuthToken();
        if (!token) {
            viajeContentArea.innerHTML = `<p class="text-red-500 p-4">Error: Debes iniciar sesión para ver esto.</p>`;
            return;
        }

        fetch('http://127.0.0.1:5001/pacto-diario/us-central1/getDailyJourneyContent', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

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

            console.log('Cargando imagen para Viaje Diario:', imageUrl);

            viajeContentArea.innerHTML = `
                <img src="${imageUrl}" alt="Imagen del día" class="w-full h-auto rounded-lg mb-4 shadow-md">
                <h1 class="text-[#1b0e0e] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 text-left pb-3 pt-5">${data.title}</h1>
                <p class="text-[#1b0e0e] text-base font-normal leading-normal pb-3 pt-1 px-4">${data.content}</p>
            `;
        })
        .catch(error => { viajeContentArea.innerHTML = `<p class="text-red-500 p-4">Error: No se pudo obtener el contenido de hoy. ${error.message}</p>`; });
    }
});