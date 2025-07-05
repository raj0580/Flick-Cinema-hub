// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your own Firebase project configuration!
const firebaseConfig = {
  apiKey: "AIzaSyBQks0nKwrtiAWmtjVDddFRQ0pCaExsAq0",
  authDomain: "flick-cinema.firebaseapp.com",
  projectId: "flick-cinema",
  storageBucket: "flick-cinema.appspot.com", // Corrected domain
  messagingSenderId: "406880429837",
  appId: "1:406880429837:web:ad57fab7fa6df46ecc7244",
  measurementId: "G-LPWTF12Q5F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);