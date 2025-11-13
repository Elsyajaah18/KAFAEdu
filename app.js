// (PERBAIKAN V23 + V22)
// TIDAK ADA 'import' di sini.

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM telah dimuat. Memulai eksekusi app.js (V25/V26)...");

    // (PERBAIKAN V23)
    // Definisikan fungsi Firebase dari 'window' object
    // Kita tambahkan pengecekan 'window.firebase' agar tidak error jika gagal dimuat
    const firebaseApp = window.firebase?.app;
    const firebaseAuth = window.firebase?.auth;
    const firebaseFirestore = window.firebase?.firestore;

    const initializeApp = firebaseApp?.initializeApp;
    const { 
        getAuth, 
        signInAnonymously, 
        signInWithCustomToken, 
        onAuthStateChanged,
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut
    } = firebaseAuth || {}; // Gunakan object kosong jika 'firebaseAuth' tidak ada
    const { 
        getFirestore, 
        doc, 
        getDoc, 
        setDoc, 
        onSnapshot, 
        collection, 
        query, 
        getDocs,
        addDoc,
        setLogLevel
    } = firebaseFirestore || {}; // Gunakan object kosong jika 'firebaseFirestore' tidak ada


    // === Variabel State Global ===
    let currentUserId = null;
    let currentUserEmail = null;
    let currentWizardStep = 1;

    // === 1. DEFINISI ELEMEN UI (SEMUA) ===
    console.log("Mencari elemen UI...");
    const contentPages = document.querySelectorAll('.spa-content');
    const allNavTargets = document.querySelectorAll('.spa-nav-link');
    const mainNavLinks = document.querySelectorAll('header nav a.spa-nav-link, #mobile-drawer a.spa-nav-link');
    
    // Auth
    const authNavButton = document.getElementById('auth-nav-button');
    const logoutButton = document.getElementById('logout-button');
    const authNavButtonMobile = document.getElementById('auth-nav-button-mobile');
    const logoutButtonMobile = document.getElementById('logout-button-mobile');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authCheckbox = document.getElementById('reg-log');

    // Mobile Drawer (V12)
    const drawerToggle = document.getElementById('drawer-toggle');
    const drawerClose = document.getElementById('drawer-close');
    const mobileDrawer = document.getElementById('mobile-drawer');

    // Notifikasi
    const notificationModal = document.getElementById('notification-modal');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');

    // Testimoni
    const testimonialsContainer = document.getElementById('testimonials-container');

    // Asisten Ide (Gemini)
    const analyzeIdeaBtn = document.getElementById('analyze-idea-btn');
    const ideaInput = document.getElementById('idea-input');
    const geminiResultContainer = document.getElementById('gemini-result-container');
    const geminiLoading = document.getElementById('gemini-loading');
    const geminiError = document.getElementById('gemini-error');
    const geminiResult = document.getElementById('gemini-result');

    // Submission Wizard (V18)
    const loginPrompt = document.getElementById('login-prompt');
    const submissionWizard = document.getElementById('submission-wizard');
    const stepLinks = document.querySelectorAll('.step-link');
    const stepContents = document.querySelectorAll('.step-content');
    const wizardNextButtons = document.querySelectorAll('.wizard-next');
    const wizardPrevButtons = document.querySelectorAll('.wizard-prev');
    const agreeGuidelines = document.getElementById('agree-guidelines');
    const agreeFinal = document.getElementById('agree-final');
    const submitManuscriptBtn = document.getElementById('submit-manuscript');
    const dropZone = document.getElementById('drop-zone');
    const fileUpload = document.getElementById('file-upload');
    const fileUploadInfo = document.getElementById('file-upload-info');
    let uploadedFile = null;

    console.log(`Menemukan ${allNavTargets.length} link navigasi.`); // Debug

    // === 2. FUNGSI INTI NON-FIREBASE (NAVIGASI, UI) ===

    function showNotification(title, message) {
        if (notificationTitle && notificationMessage && notificationModal) {
            notificationTitle.textContent = title;
            notificationMessage.textContent = message;
            notificationModal.classList.remove('hidden');
        } else {
            console.warn("Elemen notifikasi tidak ditemukan, menggunakan alert fallback.");
            alert(title + "\n\n" + message); // Fallback jika modal tidak ada
        }
    }

    if (notificationClose) {
        notificationClose.addEventListener('click', () => {
            notificationModal.classList.add('hidden');
        });
    }

    function updateContent(targetId, mode = 'login') {
        // Cek hash untuk navigasi awal
        if (targetId.startsWith('#')) {
            targetId = targetId.substring(1);
        }
        if (!targetId) {
            targetId = 'beranda'; // Default ke beranda jika hash kosong
        }

        contentPages.forEach(page => {
            page.classList.add('hidden');
        });

        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            
            if (targetId === 'auth-page') {
                if(authCheckbox) authCheckbox.checked = (mode === 'register');
                document.querySelector('footer').classList.add('hidden');
            } else {
                document.querySelector('footer').classList.remove('hidden');
            }
        } else {
            // Fallback jika ID tidak ditemukan (misal hash aneh)
            document.getElementById('beranda').classList.remove('hidden');
            targetId = 'beranda';
        }

        // Perbarui URL hash
        window.location.hash = targetId;

        mainNavLinks.forEach(link => {
            if (link.dataset.target === targetId) {
                link.classList.add('text-[#063c7c]', 'font-bold');
                link.classList.remove('text-gray-700');
            } else {
                link.classList.remove('text-[#063c7c]', 'font-bold');
                link.classList.add('text-gray-700');
            }
        });

        if(mobileDrawer) {
            mobileDrawer.classList.add('drawer-closed');
            mobileDrawer.classList.remove('drawer-open');
        }

        // Scroll ke atas (hanya jika bukan navigasi hash awal)
        if (window.scrollY > 0) {
            window.scrollTo(0, 0);
        }
        

        if (targetId === 'kirim-naskah') {
            if (submissionWizard && loginPrompt) {
                if (currentUserId) { 
                    submissionWizard.classList.remove('hidden');
                    loginPrompt.classList.add('hidden');
                } else {
                    submissionWizard.classList.add('hidden');
                    loginPrompt.classList.remove('hidden');
                }
            }
        }
    }

    // === 3. PASANG LISTENER NAVIGASI (INI YANG PALING PENTING) ===
    
    allNavTargets.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            const mode = e.currentTarget.dataset.mode || 'login';
            console.log(`Navigasi ke: ${targetId}`); // Debug
            updateContent(targetId, mode);
        });
    });

    if(drawerToggle) {
        drawerToggle.addEventListener('click', () => {
            mobileDrawer.classList.remove('drawer-closed');
            mobileDrawer.classList.add('drawer-open');
        });
    }
    if(drawerClose) {
        drawerClose.addEventListener('click', () => {
            mobileDrawer.classList.add('drawer-closed');
            mobileDrawer.classList.remove('drawer-open');
        });
    }

    // === 4. TAMPILKAN HALAMAN AWAL ===
    // (PERBAIKAN V26) Baca hash dari URL saat pertama kali load
    const initialHash = window.location.hash || '#beranda';
    updateContent(initialHash);
    console.log(`Navigasi SPA dan UI dasar telah dipasang. Halaman awal: ${initialHash}`);

    // === 5. COBA INISIALISASI FITUR ONLINE (FIREBASE, GEMINI) ===
    
    async function initializeFirebaseAndAuth() {
        console.log("Mencoba inisialisasi Firebase...");
        try {
            // (PERBAIKAN V23) Cek apakah SDK-nya berhasil dimuat
            if (!initializeApp || !getAuth || !getFirestore) {
                throw new Error("Firebase SDK gagal dimuat dari CDN. Periksa koneksi internet atau adblocker.");
            }

            const { firebaseConfig, appId, initialAuthToken } = window.KAFAEduConfig;

            if (!firebaseConfig || !firebaseConfig.apiKey) {
                throw new Error("Konfigurasi Firebase (apiKey, dll) tidak ditemukan. Masuk ke 'Mode Offline'.");
            }

            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);
            setLogLevel('Debug');

            console.log("Firebase berhasil diinisialisasi.");

            // Auth State
            onAuthStateChanged(auth, (user) => {
                if (user && !user.isAnonymous) {
                    console.log("Status Auth: Masuk sebagai", user.email);
                    currentUserId = user.uid; 
                    authNavButton.classList.add('hidden');
                    logoutButton.classList.remove('hidden');
                    authNavButtonMobile.classList.add('hidden');
                    logoutButtonMobile.classList.remove('hidden');
                } else {
                    console.log("Status Auth: Keluar atau Anonim.");
                    currentUserId = null; 
                    authNavButton.classList.remove('hidden');
                    logoutButton.classList.add('hidden');
                    authNavButtonMobile.classList.remove('hidden');
                    logoutButtonMobile.classList.add('hidden');
                }
                // Perbarui tampilan wizard di halaman kirim naskah jika sedang dibuka
                if (document.getElementById('kirim-naskah').classList.contains('spa-content') && !document.getElementById('kirim-naskah').classList.contains('hidden')) {
                     updateContent('kirim-naskah');
                }
            });

            // Handler Logout
            function handleLogout() {
                signOut(auth).then(() => {
                    showNotification('Logout Berhasil', 'Anda telah berhasil keluar.');
                    updateContent('beranda');
                }).catch((error) => {
                    showNotification('Error', 'Gagal melakukan logout.');
                });
            }
            if(logoutButton) logoutButton.addEventListener('click', handleLogout);
            if(logoutButtonMobile) logoutButtonMobile.addEventListener('click', handleLogout);

            // Handler Login
            if(loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('login-email').value;
                    const password = document.getElementById('login-password').value;
                    signInWithEmailAndPassword(auth, email, password)
                        .then(() => {
                            showNotification('Login Berhasil', `Selamat datang kembali!`);
                            updateContent('beranda');
                        })
                        .catch((error) => showNotification('Login Gagal', error.message));
                });
            }

            // Handler Register
            if(registerForm) {
                registerForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('register-email').value;
                    const password = document.getElementById('register-password').value;
                    createUserWithEmailAndPassword(auth, email, password)
                        .then(() => {
                            showNotification('Registrasi Berhasil', 'Akun Anda telah berhasil dibuat.');
                            updateContent('beranda');
                        })
                        .catch((error) => showNotification('Registrasi Gagal', error.message));
                });
            }

            // Init Testimoni
            initTestimonials(db, appId);

            // Init Gemini
            if(analyzeIdeaBtn) analyzeIdeaBtn.addEventListener('click', () => callGeminiAPI());

            // Sign in
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }

        } catch (error) {
            console.error("GAGAL INISIALISASI FIREBASE (Fitur online dinonaktifkan):", error);
            showNotification(
                "Mode Offline Terdeteksi", 
                "Gagal terhubung ke server. Anda masih bisa menelusuri situs, tetapi fitur login, testimoni, dan pengiriman naskah tidak akan berfungsi. (Error: " + error.message + ")"
            );
            // Tetap tampilkan tombol login/daftar
            if(authNavButton) authNavButton.classList.remove('hidden');
            if(authNavButtonMobile) authNavButtonMobile.classList.remove('hidden');
            if(logoutButton) logoutButton.classList.add('hidden');
            if(logoutButtonMobile) logoutButtonMobile.classList.add('hidden');
        }
    }

    // === 6. JALANKAN FUNGSI LAINNYA YANG AMAN ===
    
    function setupWizardListeners() {
        if(agreeGuidelines) {
            agreeGuidelines.addEventListener('change', () => {
                document.querySelector('#step-1 .wizard-next').disabled = !agreeGuidelines.checked;
            });
        }
        if(agreeFinal) {
            agreeFinal.addEventListener('change', () => {
                submitManuscriptBtn.disabled = !agreeFinal.checked;
            });
        }
        wizardNextButtons.forEach(button => {
            button.addEventListener('click', () => updateWizardStep(currentWizardStep + 1));
        });
        wizardPrevButtons.forEach(button => {
            button.addEventListener('click', () => updateWizardStep(currentWizardStep - 1));
        });
        stepLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (!e.currentTarget.classList.contains('disabled')) {
                    updateWizardStep(e.currentTarget.dataset.step);
                }
            });
        });
        
        function updateWizardStep(targetStep) {
            targetStep = parseInt(targetStep);
            if (targetStep < 1) targetStep = 1;
            if (targetStep > 5) targetStep = 5;

            stepContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`step-${targetStep}`).classList.add('active');

            stepLinks.forEach(link => {
                const step = parseInt(link.dataset.step);
                link.classList.remove('active', 'disabled', 'text-green-600', 'border-green-600');
                if (step < targetStep) {
                    link.classList.add('text-green-600', 'border-green-600'); // Selesai
                } else if (step === targetStep) {
                    link.classList.add('active');
                } else {
                    link.classList.add('disabled');
                }
            });
            currentWizardStep = targetStep;
            
            if (currentWizardStep === 5) {
                document.getElementById('summary-title').textContent = document.getElementById('manuscript-title').value || '(Tidak diisi)';
                document.getElementById('summary-author').textContent = document.getElementById('author-name').value || '(Tidak diisi)';
                document.getElementById('summary-file').textContent = uploadedFile ? uploadedFile.name : '(Tidak ada file)';
            }
        }

        // Logika Drop Zone
        if(dropZone) {
            dropZone.addEventListener('click', () => fileUpload.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-[#063c7c]', 'bg-blue-50');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-[#063c7c]', 'bg-blue-50');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-[#063c7c]', 'bg-blue-50');
                if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
            });
        }
        if(fileUpload) {
            fileUpload.addEventListener('change', () => {
                if (fileUpload.files.length > 0) handleFileUpload(fileUpload.files[0]);
            });
        }

        function handleFileUpload(file) {
            if (!file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
                showNotification('File Tidak Valid', 'Hanya file .doc atau .docx yang diizinkan.');
                return;
            }
            uploadedFile = file;
            fileUploadInfo.textContent = `File terpilih: ${file.name}`;
            fileUploadInfo.classList.remove('hidden');
            dropZone.classList.add('border-green-500');
            document.querySelector('#step-4 .wizard-next').disabled = false;
        }

        if(submitManuscriptBtn) {
            submitManuscriptBtn.addEventListener('click', async () => {
                if (!currentUserId) {
                    showNotification('Gagal', 'Firebase tidak terhubung. Tidak dapat mengirim naskah.');
                    return;
                }
                showNotification('Mengirim...', 'Harap tunggu, naskah Anda sedang dikirim.');
                setTimeout(() => {
                    showNotification('Pengiriman Berhasil!', 'Naskah Anda telah berhasil dikirim (Simulasi).');
                    updateContent('beranda');
                }, 2000);
            });
        }
    }
    
    // Fungsi-fungsi yang bergantung pada Firebase/Gemini
    
    async function initTestimonials(db, appId) {
        if (!testimonialsContainer || !collection) return;
        const testimonialsRef = collection(db, `artifacts/${appId}/public/data/testimonials`);
        try {
            const snapshot = await getDocs(testimonialsRef);
            if (snapshot.empty) {
                const mockTestimonials = [
                    { id: "fBPskr5adZOhPDP1f8IT", name: "Dr. Budi", role: "Peneliti", quote: "Proses review di KAFAEdu sangat cepat dan konstruktif. Sangat direkomendasikan!" },
                    { id: "XRm6R88YNZUuLNdccfq5", name: "Prof. Citra", role: "Dosen", quote: "Jurnal ini menjadi acuan penting dalam bidang pedagogi di Indonesia." },
                ];
                for (const testimonial of mockTestimonials) {
                    const docRef = doc(db, `artifacts/${appId}/public/data/testimonials`, testimonial.id);
                    await setDoc(docRef, { name: testimonial.name, role: testimonial.role, quote: testimonial.quote });
                }
            }
        } catch (error) { console.error("Gagal init testimoni:", error); }

        onSnapshot(testimonialsRef, (snapshot) => {
            if (snapshot.empty) {
                testimonialsContainer.innerHTML = '<p class="text-gray-500 text-center col-span-full">Belum ada testimoni.</p>';
                return;
            }
            testimonialsContainer.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const testimonialEl = document.createElement('div');
                testimonialEl.className = 'bg-white p-6 rounded-lg shadow-lg transform transition duration-300 hover:scale-105';
                testimonialEl.innerHTML = `
                    <p class="text-gray-700 italic">"${data.quote}"</p>
                    <p class="text-right font-bold text-gray-900 mt-4">- ${data.name}</p>
                    <p class="text-right text-sm text-[#063c7c]">${data.role}</p>
                `;
                testimonialsContainer.appendChild(testimonialEl);
            });
        }, (error) => {
            console.error("Gagal onSnapshot testimoni:", error);
            testimonialsContainer.innerHTML = '<p class="text-gray-500 text-center col-span-full">Gagal memuat testimoni (Mode Offline).</p>';
        });
    }

    async function callGeminiAPI() {
        const userIdea = ideaInput.value;
        if (!userIdea.trim()) {
            showNotification("Input Kosong", "Silakan masukkan ide atau draf judul Anda.");
            return;
        }

        geminiResultContainer.classList.remove('hidden');
        geminiLoading.classList.remove('hidden');
        geminiError.classList.add('hidden');
        geminiResult.classList.add('hidden');
        geminiResult.innerHTML = '';

        const systemPrompt = `
            Anda adalah Asisten Editor untuk "KAFAEdu: Journal of Education and Pedagogy".
            Fokus & Ruang Lingkup jurnal adalah:
            1. Basic and Primary Education
            2. Indonesian language and literature education
            3. Civic and Character Education
            4. History of Education and Social Studies
            5. Literacy and Learning Innovation
            Tugas Anda:
            1. Analisis ide/judul.
            2. Tentukan SESUAI atau TIDAK SESUAI.
            3. Berikan "Analisis Kesesuaian" (1-2 kalimat).
            4. Berikan "Potensi Kontribusi" (1-2 kalimat).
            5. Berikan 2 "Saran Judul Alternatif".
            6. Format output HANYA dalam HTML (<strong>, <ul>, <li>). JANGAN gunakan markdown.
        `;
        const apiKey = ""; // Disediakan oleh environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: userIdea }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        try {
            let response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            
            if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts[0].text) {
                throw new Error("Respon dari API tidak valid.");
            }

            const resultText = result.candidates[0].content.parts[0].text;
            
            geminiResult.innerHTML = resultText;
            geminiResult.classList.remove('hidden');
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            geminiError.textContent = `Gagal menganalisis ide: ${error.message}. Silakan coba lagi.`;
            geminiError.classList.remove('hidden');
        } finally {
            geminiLoading.classList.add('hidden');
        }
    }
    
    // === 7. JALANKAN INISIALISASI ===
    setupWizardListeners(); // Pasang listener UI wizard (aman)
    initializeFirebaseAndAuth(); // Coba jalankan fitur online

}); // Penutup DOMContentLoaded
