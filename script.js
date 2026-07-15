import { db } from "./db.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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