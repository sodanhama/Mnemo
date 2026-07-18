import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDYbUboQVYqv7ofI8VZmjAZE0vijDclH-M", /* afaik i dont need to secure this??? */
    authDomain: "mnemo-8c588.firebaseapp.com",
    projectId: "mnemo-8c588",
    storageBucket: "mnemo-8c588.firebasestorage.app",
    messagingSenderId: "706196639379",
    appId: "1:706196639379:web:28e05b0d19cbfd602b4766",
    measurementId: "G-W35HNLR02L"
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);