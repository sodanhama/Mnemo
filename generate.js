import { db } from "./db.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const model = "cohere/north-mini-code:free";

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

async function generateFlashcards(topic) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: "You generate flashcards. Respond ONLY with a JSON array like: [{\"front\":\"question text\",\"back\":\"answer text\"}]. No markdown, no explanation, no extra keys." },
                { role: "user", content: `Generate 10 flashcards about: ${topic}` }
            ]
        })
    })
    return response.json();
}

const generateDeckField = document.getElementById("generate-deck-field");
const deckAnswerDiv = document.getElementById("deck-answer");

generateDeckField.addEventListener("keypress", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        generateDeckField.blur();
        generateDeckField.disabled = true;
        try {
            const topic = generateDeckField.value.trim();
            const flashcards = await generateFlashcards(topic);
            const cards = JSON.parse(flashcards.choices[0].message.content);
            const deckId = await saveDeck(topic, cards);
            console.log("Deck saved:", deckId);
            const deckAnswer = document.createElement("p");
            deckAnswer.textContent = `Flashcards generated and saved for topic: "${topic}".`;
            deckAnswerDiv.innerHTML = "";
            deckAnswerDiv.appendChild(deckAnswer);
            generateDeckField.value = "";
            generateDeckField.disabled = false;
        } catch (error) {
            const deckAnswer = document.createElement("p");
            deckAnswer.textContent = "Error generating flashcards: " + error.message;
            deckAnswerDiv.innerHTML = "";
            deckAnswerDiv.appendChild(deckAnswer);
            generateDeckField.disabled = false;
        }
    }
});