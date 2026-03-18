import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLAhxB2rUJK71Tp5MmjhQZnxPpU9cWw7g",
  authDomain: "campus-connect-83643.firebaseapp.com",
  projectId: "campus-connect-83643",
  storageBucket: "campus-connect-83643.firebasestorage.app",
  messagingSenderId: "99840521646",
  appId: "1:99840521646:web:6887a5829883001f53443f",
  measurementId: "G-ZRS8WDE7K8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// THESE TWO LINES MUST START WITH 'export'
export const auth = getAuth(app); 
export const db = getFirestore(app);