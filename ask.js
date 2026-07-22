import { db } from "./db.js";
import { 
    collection, addDoc, doc, getDoc, getDocs, query, orderBy, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const model = "cohere/north-mini-code:free";

const sessionList = document.getElementById("session-list");
const chatThread = document.getElementById("chat-thread");
const askMnemoField = document.getElementById("ask-mnemo-field");
const newSessionButton = document.getElementById("new-session-button");

let currentSessionId = null;
let currentMessages = [];

async function generateAnswer(messages) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: "You answer questions without markdown or extra formatting. Keep replies concise." },
                ...messages
            ]
        })
    }).then(res => res.json());
    return response.choices[0].message.content;
}

async function createSession(firstMessage) {
    const sessionRef = await addDoc(collection(db, "sessions"), {
        title: firstMessage.slice(0, 50),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    })
    return sessionRef.id;
}

async function saveMessage(sessionId, role, content) {
    await addDoc(collection(db, "sessions", sessionId, "messages"), {
        role,
        content,
        createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "sessions", sessionId), {
        updatedAt: serverTimestamp()
    })
}

async function loadMessages(sessionId) {
    const q = query(collection(db, "sessions", sessionId, "messages"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}

async function loadSessions() {
    const q = query(collection(db, "sessions"), orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderMessage(role, content) {
    const bubble = document.createElement("p");
    bubble.classList.add("chat-bubble", role === "user" ? "chat-user" : "chat-assistant");
    bubble.textContent = content;
    chatThread.appendChild(bubble);
    chatThread.scrollTop = chatThread.scrollHeight;
}

async function renderSessionList() {
    const sessions = await loadSessions();
    sessionList.innerHTML = "";
    sessions.forEach(session => {
        const item = document.createElement("button");
        item.classList.add("session-item");
        item.textContent = session.title || "Untitled";
        if (session.id === currentSessionId) item.classList.add("active");
        item.addEventListener("click", () => openSession(session.id));
        sessionList.appendChild(item);
    })
}

async function openSession(sessionId) {
    currentSessionId = sessionId;
    currentMessages = await loadMessages(sessionId);
    chatThread.innerHTML = "";
    currentMessages.forEach(msg => renderMessage(msg.role, msg.content));
    renderSessionList();
}

function startNewSession() {
    currentSessionId = null;
    currentMessages = [];
    chatThread.innerHTML = "";
    renderSessionList();
    askMnemoField.focus();
}

newSessionButton.addEventListener("click", startNewSession);

askMnemoField.addEventListener("keypress", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();

        const question = askMnemoField.value.trim();
        if (!question) return;

        askMnemoField.value = "";
        askMnemoField.disabled = true;

        try {
            if (!currentSessionId) {
                currentSessionId = await createSession(question);
            }

            renderMessage("user", question);
            currentMessages.push({role: "user", content: question});
            await saveMessage(currentSessionId, "user", question);

            const answer = await generateAnswer(currentMessages);
            renderMessage("assistant", answer);
            currentMessages.push({role: "assistant", content: answer});
            await saveMessage(currentSessionId, "assistant", answer);

            renderSessionList();
        }
        catch (error) {
            renderMessage("assistant", "Error generating response: " + error.message);
        } finally {
            askMnemoField.disabled = false;
            askMnemoField.focus();
        }
    }
})

renderSessionList();

const generateFromSessionButton = document.getElementById("generate-from-session-button");

async function generateFlashcardsFromSession(messages) {
    const transcript = messages.map(msg => `${msg.role}: ${msg.content}`).join("\n");
    
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: "You generate flashcards based on a conversation transcript. Respond ONLY with a JSON array like: [{\"front\":\"question text\",\"back\":\"answer text\"}]. No markdown, no explanation, no extra keys." },
                { role: "user", content: `Generate 10 flashcards based on the key facts and concepts discussed in this conversation:\n\n${transcript}` }
            ]
        })
    }).then(res => res.json());

    return JSON.parse(response.choices[0].message.content);
}

async function saveDeck(topic, cards) {
    const deckRef = await addDoc(collection(db, "decks"), {
        topic,
        createdAt: serverTimestamp(),
    })
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

generateFromSessionButton.addEventListener("click", async () => {
    if (currentMessages.length === 0) {
        renderMessage("assistant", "start a conversation first before generating flashcards");
        return;
    }

    generateFromSessionButton.disabled = true;
    generateFromSessionButton.textContent = "generating...";

    try {
        const cards = await generateFlashcardsFromSession(currentMessages);
        const sessionTitle = document.querySelector(".session-item.active")?.textContent || "Session deck";
        const deckId = await saveDeck(sessionTitle, cards);
        renderMessage("assistant", `Flashcards generated and saved from this session (deck ID: ${deckId}).`);
    } catch (error) {
        renderMessage("assistant", "Error generating flashcards: " + error.message);
    } finally {
        generateFromSessionButton.disabled = false;
        generateFromSessionButton.textContent = "generate flashcards from this session";
    }
});