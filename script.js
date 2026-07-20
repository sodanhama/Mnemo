import { db } from "./db.js";
import { collection, addDoc, collectionGroup, query, where, getDocs, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { sm2 } from "./sm2.js";

const model = "cohere/north-mini-code:free";
/* 
"anthropic/claude-haiku-4.5"
*/
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

const askMnemoField = document.getElementById("ask-mnemo-field");
const mnemoAnswerDiv = document.getElementById("mnemo-answer");

async function generateFlashcards(topic) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages:[
                { role: "system", content: "You generate flashcards. Respond ONLY with a JSON array like: [{\"front\":\"question text\",\"back\":\"answer text\"}]. No markdown, no explanation, no extra keys." },
                { role: "user", content: `Generate 10 flashcards about: ${topic}` }
            ]
        })
    })

    return response.json();
}

async function generateAnswer(question) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages:[
                { role: "system", content: "You answer questions without markdown, formatting and extra text. Aim for a single paragraph." },
                { role: "user", content: question }
            ]
        })
    }).then(res => res.json());
    return response.choices[0].message.content;
}

async function isFlashcardRequest(question) {
    const checkResponse = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages:[
                { role: "system", content: "You can only answer with 'yes' or 'no'" },
                { role: "user", content: "Is the following question a request for flashcards?: " + question }
            ]
        })
    })

    const data = await checkResponse.json()
    const answer = data.choices[0].message.content.trim().toLowerCase();
    return answer === "yes"
}

askMnemoField.addEventListener("keypress", async function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        askMnemoField.blur();
        askMnemoField.disabled = true;
        try {
            const question = askMnemoField.value.trim();
            const isFlashcard = await isFlashcardRequest(question);
            if (isFlashcard) {
                const flashcards = await generateFlashcards(question);
                const cards = JSON.parse(flashcards.choices[0].message.content);
                const deckId = await saveDeck(question, cards);
                console.log("Deck saved:", deckId);
                const mnemoAnswer = document.createElement("p");
                mnemoAnswer.textContent = `Flashcards generated and saved for topic: "${question}".`;
                mnemoAnswerDiv.id = "mnemo-answer";
                mnemoAnswerDiv.appendChild(mnemoAnswer);
            } else {
                const answer = await generateAnswer(question);
                const mnemoAnswer = document.createElement("p");
                mnemoAnswer.textContent = answer;
                mnemoAnswerDiv.innerHTML = "";
                mnemoAnswerDiv.id = "mnemo-answer";
                mnemoAnswerDiv.appendChild(mnemoAnswer);
            }
            askMnemoField.value = "";
            askMnemoField.disabled = false;
        } catch (error) {
            const mnemoAnswer = document.createElement("p");
            mnemoAnswer.textContent = "Error generating response: " + error.message;
            mnemoAnswerDiv.innerHTML = "";
            mnemoAnswerDiv.id = "mnemo-answer";
            mnemoAnswerDiv.appendChild(mnemoAnswer);
            askMnemoField.disabled = false;
        }
    }

})

document.addEventListener("keydown", function(event) {
    if (event.key === "/" && document.activeElement !== askMnemoField) {
        event.preventDefault();
        askMnemoField.focus();
        askMnemoField.value = "";
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

    document.getElementById("start-review-button").style.display = "none";
    document.getElementById("review-container").style.display = "block";

    showCard();
}

function showCard() {
    const status = document.getElementById("review-status");

    if (currentCardIndex >= dueCards.length) {
        document.getElementById("card-front").textContent = "";
        document.getElementById("card-back").style.display = "none";
        document.getElementById("grade-buttons").style.display = "none";
        status.style.textAlign = "center";
        status.textContent = "Review complete!";
        return;
   }

   const card = dueCards[currentCardIndex];
   document.getElementById("card-front").textContent = card.front;
   document.getElementById("card-back").textContent = card.back;
   document.getElementById("card-back").style.display = "none";
   document.getElementById("grade-buttons").style.display = "none";
   status.textContent = `Card ${currentCardIndex + 1} of ${dueCards.length}`;
}

document.getElementById("review-container").addEventListener("click", function() {
    if (currentCardIndex >= dueCards.length) return;
    document.getElementById("card-back").style.display = "block";
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