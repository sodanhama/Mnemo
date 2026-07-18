import { db } from "./db.js";
import { collection, addDoc, collectionGroup, query, where, getDocs, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { sm2 } from "./sm2.js";

async function saveDeck(topic, cards) {
    const deckRef = await addDoc(collection(db, "decks"), {
        topic,
        createdAt: serverTimestamp()
    });
    
    for (const card of cards) {
        await addDoc(collection(db, "decks", deckRef.id, "cards"), {
            front: card.front,
            back: card.back,
            interval: 0,
            repetition: 0,
            easeFactor: 2.5,
            dueDate: serverTimestamp(),
            createdAt: serverTimestamp()
        })
    }

    return deckRef.id;
}

const inputField = document.getElementById("input-field");

async function generateFlashcards(topic) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "cohere/north-mini-code:free",
            messages:[
                { role: "system", content: "You generate flashcards. Respond ONLY with a JSON array like: [{\"front\":\"question text\",\"back\":\"answer text\"}]. No markdown, no explanation, no extra keys." },
                { role: "user", content: `Generate 10 flashcards about: ${topic}` }
            ]
        })
    })

    return response.json();
}

inputField.addEventListener("keypress", async function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        inputField.blur()
        inputField.disabled = true;
        try {
            const topic = inputField.value.trim();
            const flashcards = await generateFlashcards(topic);
            const cards = JSON.parse(flashcards.choices[0].message.content);
            const deckId = await saveDeck(topic, cards);
            console.log("Deck saved:", deckId);
            inputField.value = "";
            inputField.disabled = false;
        } catch (error) {
            alert("Error generating flashcards: " + error.message);
            inputField.disabled = false;
        }
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "/" && document.activeElement !== inputField) {
        event.preventDefault();
        inputField.focus();
        inputField.value = "";
    }
})

let dueCards = [];
let currentCardIndex = 0;

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

async function startReview() {
    dueCards = await getDueCards();
    currentCardIndex = 0;

    document.getElementById("input-container").style.display = "none";
    document.getElementById("start-review-button").style.display = "none";
    document.getElementById("review-container").style.display = "block";

    showCard();
}

function showCard() {
    const status = document.getElementById("review-status");

    if (currentCardIndex >= dueCards.length) {
        document.getElementById("card-front").textContent = "";
        document.getElementById("card-back").style.display = "none";
        document.getElementById("show-answer-button").style.display = "none";
        document.getElementById("grade-buttons").style.display = "none";
        status.textContent = "Review complete!";
        return;
   }

   const card = dueCards[currentCardIndex];
   document.getElementById("card-front").textContent = card.front;
   document.getElementById("card-back").textContent = card.back;
   document.getElementById("card-back").style.display = "none";
   document.getElementById("show-answer-button").style.display = "inline-block";
   document.getElementById("grade-buttons").style.display = "none";
   status.textContent = `Card ${currentCardIndex + 1} of ${dueCards.length}`;
}

document.getElementById("show-answer-button").addEventListener("click", function() {
    document.getElementById("card-back").style.display = "block";
    document.getElementById("show-answer-button").style.display = "none";
    document.getElementById("grade-buttons").style.display = "block";
})

document.getElementById("grade-buttons").addEventListener("click", async function(event) {
    if (event.target.tagName !== "BUTTON") return;
    
    const quality = parseInt(event.target.dataset.quality);
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
})

document.getElementById("start-review-button").addEventListener("click", startReview);