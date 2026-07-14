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
        inputField.blur()
        inputField.disabled = true;
        try {
            const flashcards = await generateFlashcards(inputField.value.trim());
            console.log(flashcards);
            console.log(flashcards.choices[0].message.content)
            for (const flashcard of JSON.parse(flashcards.choices[0].message.content)) {
                console.log(flashcard);}
            inputField.value = ""
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