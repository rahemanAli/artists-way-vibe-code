import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCQVj0HM5XZbkfyb_Dir45RA3lKFQ8nSa4",
    authDomain: "artists-way-journey.firebaseapp.com",
    projectId: "artists-way-journey",
    storageBucket: "artists-way-journey.firebasestorage.app",
    messagingSenderId: "739121583906",
    appId: "1:739121583906:web:877800656ad09befd7b77b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
