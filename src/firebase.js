// force rebuild
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyD0EvwlnkP6UY34JQWOsce9HxNeAhk3m2c",
    authDomain: "slidebridgep.firebaseapp.com",
    projectId: "slidebridgep",
    storageBucket: "slidebridgep.firebasestorage.app",
    messagingSenderId: "289465777358",
    appId: "1:289465777358:web:8dc641065e81667477249f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
signInAnonymously(auth).catch((error) => console.error(error));