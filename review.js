import { db } from "./db.js";
import { collectionGroup, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { sm2 } from "./sm2.js";

let dueCards = [];
let currentCardIndex = 0;

const reviewContainer = document.getElementById("review-container");
const gradeButtons = document.querySelectorAll("#review-container button[data-quality]");

async function getDueCards() {
    const now = new Date();
    const q = query(collectionGroup(db, "cards"), where("dueDate", "<=", now));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ref: docSnap.ref,
        ...docSnap.data()
    }))
}

function hideGradeButtons() {
    gradeButtons.forEach(btn => btn.style.display = "none");
}

function showGradeButtons() {
    gradeButtons.forEach(btn => btn.style.display = "inline-block");
}

function showCard() {
    const status = document.getElementById("review-status");

    if (currentCardIndex >= dueCards.length) {
        document.getElementById("card-front").textContent = "";
        document.getElementById("card-back").style.display = "none";
        hideGradeButtons();
        status.style.textAlign = "center";
        status.textContent = "Review complete!";
        return;
    }

    const card = dueCards[currentCardIndex];
    document.getElementById("card-front").textContent = card.front;
    document.getElementById("card-back").textContent = card.back;
    document.getElementById("card-back").style.display = "none";
    hideGradeButtons();
    status.textContent = `Card ${currentCardIndex + 1} of ${dueCards.length}`;
}

reviewContainer.addEventListener("click", function (event) {
    if (currentCardIndex >= dueCards.length) return;

    if (event.target.tagName === "BUTTON" && event.target.dataset.quality !== undefined) {
        gradeCard(event.target);
        return;
    }

    const cardBack = document.getElementById("card-back");
    if (cardBack.style.display === "none") {
        cardBack.style.display = "block";
        showGradeButtons();
    }
});

async function gradeCard(button) {
    const quality = parseInt(button.dataset.quality);
    const card = dueCards[currentCardIndex];
    const updated = sm2(card, quality);

    await updateDoc(card.ref, {
        interval: updated.interval,
        repetition: updated.repetition,
        easeFactor: updated.easeFactor,
        dueDate: updated.dueDate
    })

    currentCardIndex++
    showCard()
}

(async function init() {
    dueCards = await getDueCards();
    currentCardIndex = 0;
    hideGradeButtons();
    showCard();
})();