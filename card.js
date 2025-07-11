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

const raritiesOrder = ['Légendaire', 'Épique', 'Rare', 'Commune', 'Médiocre'];

function normalizeId(id) {
  if (!id) return null;
  return id.startsWith('#') ? id.slice(1) : id;
}

function render(cardsData, drawHistory) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  console.log("cardsData:", cardsData);
  console.log("drawHistory:", drawHistory);

  // Set des IDs normalisés des cartes obtenues
  const obtainedIds = new Set(
    (drawHistory || []).map(entry => {
      const id = entry.card?.id;
      const norm = normalizeId(id);
      console.log(`DrawHistory card id raw: "${id}" normalized: "${norm}"`);
      return norm;
    }).filter(Boolean)
  );
  console.log("Obtained IDs set:", obtainedIds);

  // Regroupement par rareté
  const rarityMap = {};
  cardsData.forEach(card => {
    const rarete = card.rarete;
    if (!rarityMap[rarete]) rarityMap[rarete] = [];
    rarityMap[rarete].push(card);
  });

  raritiesOrder.forEach(rarete => {
    const cards = rarityMap[rarete];
    if (!cards) return;

    const section = document.createElement('div');
    section.className = 'rarete-section';

    const ownedCount = cards.filter(card => obtainedIds.has(normalizeId(card.id))).length;

    const title = document.createElement('div');
    title.className = 'rarete-title';
    title.textContent = `${rarete} (${ownedCount}/${cards.length})`;

    const grid = document.createElement('div');
    grid.className = 'card-grid';

    cards.forEach(card => {
      const normalizedCardId = normalizeId(card.id);
      const possessed = obtainedIds.has(normalizedCardId);
      const rareteClass = rarete.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

      const div = document.createElement('div');
      div.className = `card ${possessed ? 'possessed' : 'not-possessed'} ${rareteClass}`;
      div.innerHTML = `
        <div class="card-id">${card.id}</div>
        <div class="card-name">${card.nom}</div>
        <div class="card-desc">${card.description}</div>
      `;
      grid.appendChild(div);
    });

    section.appendChild(title);
    section.appendChild(grid);
    container.appendChild(section);
  });
}

function setupHomeButton() {


}



onAuthStateChanged(auth, async user => {
  setupHomeButton();

  const container = document.getElementById('cards-container');
  if (!user) {
    container.textContent = 'Veuillez vous connecter.';
    return;
  }

  try {
    const [cardsResponse, userSnap] = await Promise.all([
      fetch('card.json').then(r => r.json()),
      get(ref(db, `users/${user.uid}`))
    ]);

    console.log("cardsResponse loaded:", cardsResponse);
    console.log("userSnap loaded:", userSnap.exists() ? userSnap.val() : null);

    const cardsData = cardsResponse;
    const userData = userSnap.exists() ? userSnap.val() : {};
    // Utilisation de la clé correcte drawHistory (pas tirages)
    const drawHistory = userData.drawHistory || [];

    render(cardsData, drawHistory);

  } catch (e) {
    console.error(e);
    container.textContent = 'Erreur de chargement : ' + e.message;
  }
});
