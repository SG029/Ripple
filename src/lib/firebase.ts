import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
// import { getAnalytics } from "firebase/analytics"; // Optional: if you need analytics

const firebaseConfig = {
  apiKey: "AIzaSyD1EOkdb6GqOH1vnqUAdmryPRIDYn-w8tc",
  authDomain: "haven-2-c17f9.firebaseapp.com",
  databaseURL: "https://haven-2-c17f9-default-rtdb.firebaseio.com",
  projectId: "haven-2-c17f9",
  storageBucket: "haven-2-c17f9.firebasestorage.app",
  messagingSenderId: "43552471702",
  appId: "1:43552471702:web:c2b5781cfa51265a9ca0b7",
  measurementId: "G-QD2VCZ1LLK"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Database = getDatabase(app);
// const analytics = getAnalytics(app); // Optional

export { app, auth, db };
