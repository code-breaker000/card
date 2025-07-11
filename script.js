import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  update
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRNaWcOMiqW8CsDLMQds4L2pScQXHSOvg",
  authDomain: "card-6143c.firebaseapp.com",
  databaseURL: "https://card-6143c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "card-6143c",
  storageBucket: "card-6143c.appspot.com",
  messagingSenderId: "470927423801",
  appId: "1:470927423801:web:1bd258e29d5438e8eb90e8",
  measurementId: "G-339FRXV4MM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

let cards = [];

async function loadCards() {
  const res = await fetch("card.json");
  if (!res.ok) throw new Error("Erreur de chargement card.json");
  cards = await res.json();
}

const rarityProbabilities = [
  { rarity: "Légendaire", chance: 0.001 },
  { rarity: "Épique", chance: 0.05 },
  { rarity: "Rare", chance: 0.149 },
  { rarity: "Commune", chance: 0.3 },
  { rarity: "Médiocre", chance: 0.5 }
];

function drawRarity() {
  const rand = Math.random();
  let cumulative = 0;
  for (const r of rarityProbabilities) {
    cumulative += r.chance;
    if (rand < cumulative) return r.rarity;
  }
  return "Médiocre";
}

function drawCard() {
  const rarity = drawRarity();
  const filtered = cards.filter(c => c.rarete === rarity);
  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function showCard(card) {
  const cardName = document.getElementById("cardName");
  const cardRarity = document.getElementById("cardRarity");
  const cardDesc = document.getElementById("cardDesc");
  const cardDiv = document.getElementById("card");

  cardName.textContent = card.nom;
  cardRarity.textContent = card.rarete;
  cardRarity.className = card.rarete;
  cardDesc.textContent = card.description;
  cardDiv.style.display = "block";
}

const authSection = document.getElementById("auth-section");
const userSection = document.getElementById("user-section");
const userPseudoSpan = document.getElementById("userPseudo");
const btnSignup = document.getElementById("btnSignup");
const btnLogin = document.getElementById("btnLogin");
const btnGoogle = document.getElementById("btnGoogle");
const btnLogout = document.getElementById("btnLogout");
const btnDraw = document.getElementById("btnDraw");
const btnViewCards = document.getElementById("btnViewCards");

let isAdmin = false;

btnSignup.onclick = () => {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const pseudo = document.getElementById("signupPseudo").value.trim();
  if (!email || !password || !pseudo) return alert("Tous les champs sont obligatoires.");

  createUserWithEmailAndPassword(auth, email, password)
    .then(({ user }) => {
      return set(ref(db, "users/" + user.uid), {
        email,
        pseudo,
        lastDraw: null,
        lastCard: null,
        drawHistory: []
      });
    })
    .then(() => alert("Compte créé, connectez-vous."))
    .catch(e => alert("Erreur inscription: " + e.message));
};

btnLogin.onclick = () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) return alert("Tous les champs sont obligatoires.");

  signInWithEmailAndPassword(auth, email, password)
    .catch(e => alert("Erreur connexion: " + e.message));
};

btnGoogle.onclick = () => {
  signInWithPopup(auth, provider)
    .then(async ({ user }) => {
      const userRef = ref(db, "users/" + user.uid);
      const snap = await get(userRef);
      if (!snap.exists() || !snap.val().pseudo) {
        let pseudo = prompt("Entrez un pseudo :");
        if (!pseudo) {
          alert("Pseudo requis !");
          await signOut(auth);
          return;
        }
        await set(userRef, {
          email: user.email,
          pseudo: pseudo.trim(),
          lastDraw: null,
          lastCard: null,
          drawHistory: []
        });
      }
    })
    .catch(e => alert("Erreur Google: " + e.message));
};

btnLogout.onclick = () => {
  signOut(auth);
};

btnViewCards.onclick = () => {
  window.location.href = "card.html";
};

onAuthStateChanged(auth, async user => {
  if (user) {
    authSection.style.display = "none";
    userSection.style.display = "block";

    const userRef = ref(db, "users/" + user.uid);
    const snap = await get(userRef);
    if (!snap.exists()) {
      alert("Erreur: utilisateur non trouvé en DB.");
      return;
    }

    const userData = snap.val();
    userPseudoSpan.textContent = userData.pseudo;
    isAdmin = (userData.pseudo === "code_breaker00");

    if (userData.lastCard) showCard(userData.lastCard);
    else document.getElementById("card").style.display = "none";
  } else {
    authSection.style.display = "block";
    userSection.style.display = "none";
    document.getElementById("card").style.display = "none";
    isAdmin = false;
  }
});

await loadCards();

btnDraw.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return alert("Connectez-vous d'abord.");

  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);
  if (!snap.exists()) return alert("Utilisateur introuvable.");

  const userData = snap.val();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  if (!isAdmin && userData.lastDraw === today) {
    alert("Vous avez déjà tiré une carte aujourd'hui !");
    if (userData.lastCard) showCard(userData.lastCard);
    return;
  }

  let card = null;

  if (isAdmin) {
    const tag = prompt("Entrez le hashtag de la carte à donner (ex : #001) ou laissez vide pour tirage aléatoire:");
    if (tag && tag.startsWith("#")) {
      card = cards.find(c => c.id === tag);
      if (!card) {
        alert("Carte avec ce hashtag introuvable, tirage aléatoire à la place.");
        card = drawCard();
      }
    } else {
      card = drawCard();
    }
  } else {
    card = drawCard(); // ✅ correction ici
  }

  if (!card) return alert("Erreur lors du tirage.");

  const history = userData.drawHistory || [];
  history.unshift({ date: today, card });

  await update(userRef, {
    lastDraw: today,
    lastCard: card,
    drawHistory: history
  });

  showCard(card);
};
