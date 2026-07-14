inputField = document.getElementById("input-field");

async function generateFlashcards(topic) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "poolside/laguna-xs-2.1:free",
            messages:[
                { role: "system", content: "You generate flashcard Q&A pairs as strict JSON arrays." },
                { role: "user", content: `Generate 10 flashcards about: ${topic}` }
            ]
        })
    })

    return response.json();
}

inputField.addEventListener("keypress", async function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        try {
            const flashcards = await generateFlashcards(inputField.value.trim());
            console.log(flashcards);
            console.log(flashcards.choices[0].message.content)
        } catch (error) {
            console.error("Error generating flashcards:", error);
        }
    }
});
