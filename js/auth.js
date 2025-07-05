import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Route Protection ---
const protectAdminRoute = () => {
    onAuthStateChanged(auth, (user) => {
        // If there's no user and we are on the admin page, redirect to login
        if (!user && window.location.pathname.includes('admin.html')) {
            window.location.href = 'login.html';
        }
    });
};

// --- Login Logic ---
const handleLogin = () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    // If user is already logged in, redirect to admin page
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = 'admin.html';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const loginButton = document.getElementById('login-button');

        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
        errorMessage.textContent = '';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'admin.html';
        } catch (error) {
            errorMessage.textContent = "Login failed: Invalid email or password.";
            console.error("Login Error:", error);
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    });
};

// --- Logout Logic ---
const handleLogout = () => {
    // We use event delegation on the body because the logout button is dynamically added
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'logout-btn') {
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout failed:', error);
                alert('Failed to log out. Please try again.');
            }
        }
    });
};


// Run functions based on the current page
if (window.location.pathname.includes('login.html')) {
    handleLogin();
} else if (window.location.pathname.includes('admin.html')) {
    protectAdminRoute();
    handleLogout();
}