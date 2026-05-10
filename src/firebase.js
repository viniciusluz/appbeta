import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA7SkFRz8e6m2yHv60IZYN3Ht68T8BdD4A",
  authDomain: "liguaforge.firebaseapp.com",
  databaseURL: "https://liguaforge-default-rtdb.firebaseio.com",
  projectId: "liguaforge",
  storageBucket: "liguaforge.firebasestorage.app",
  messagingSenderId: "487494893752",
  appId: "1:487494893752:web:35a512aac629c7aae6b44d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const ADMIN_UID = "rxGc3c30scevQjMmmzT61KcJQ5N2";
