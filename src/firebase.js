import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBGaDBUj9vOKM-8K5Av0hDYtMuzzApwdt4",
    authDomain: "slidebridgep.firebaseapp.com",
    projectId: "slidebridgep",
    storageBucket: "slidebridgep.firebasestorage.app",
    messagingSenderId: "289465777358",
    appId: "1:289465777358:web:91db76db67ed5b7c77249f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
signInAnonymously(auth).catch((error) => console.error(error));