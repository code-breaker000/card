import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRNaWcOMiqW8CsDLMQds4L2pScQXHSOvg",
  authDomain: "card-6143c.firebaseapp.com",
  databaseURL: "https://card-6143c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "card-6143c",
  storageBucket: "card-6143c.appspot.com",
  messagingSenderId: "470927423801",
  appId: "1:470927423801:web:1bd258e29d5438e8eb90e8"
}; 

initializeApp(firebaseConfig);

const auth = getAuth();
const db = getDatabase();

// Ordre de rareté pour le tri
const rarityOrder = ["Légendaire", "Épique", "Rare", "Commune", "Médiocre"];

function render(drawHistory) {
  const counts = {};
  drawHistory.forEach(entry => {
    const id = entry.card.hashtag || entry.card.id;
    if (!id) return;
    if (!counts[id]) {
      counts[id] = { count: 1, data: entry.card };
    } else {
      counts[id].count++;
    }
  });

  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  const cardList = Object.values(counts);

  // Tri selon l’ordre des raretés
  cardList.sort((a, b) => {
    const r1 = rarityOrder.indexOf(a.data.rarete);
    const r2 = rarityOrder.indexOf(b.data.rarete);
    return r1 - r2;
  });

  if (cardList.length === 0) {
    container.innerHTML = '<p>Aucune carte tirée pour le moment.</p>';
    return;
  }

  cardList.forEach(item => {
    const card = item.data;
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="card-id">${card.hashtag || card.id}</div>
      <div class="card-name">${card.nom}</div>
      <div class="card-rarete ${card.rarete.toLowerCase()}">${card.rarete}</div>
      <div class="card-desc">${card.description}</div>
      <div class="card-count">Tirée ${item.count} fois</div>
    `;
    container.appendChild(div);
  });
}

function setupHomeButton() {
  const btn = document.createElement("button");
  btn.id = "btnHome";
  btn.textContent = "🏠 Accueil";
  btn.style = "position: fixed; top: 10px; left: 10px; z-index: 1000; padding: 5px 10px;";
  btn.onclick = () => window.location.href = "index.html";
  document.body.appendChild(btn);
}

onAuthStateChanged(auth, async user => {
  setupHomeButton();

  const container = document.getElementById('cards-container');
  if (!user) {
    container.textContent = 'Veuillez vous connecter.';
    return;
  }

  try {
    const userRef = ref(db, `users/${user.uid}`);
    const snap = await get(userRef);
    if (!snap.exists()) {
      container.textContent = 'Aucun historique trouvé.';
      return;
    }

    const userData = snap.val();
    const drawHistory = userData.drawHistory || [];
    render(drawHistory);

  } catch (e) {
    container.textContent = 'Erreur de chargement : ' + e.message;
  }
});
