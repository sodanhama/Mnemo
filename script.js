inputField = document.getElementById("input-field");
submitButton = document.getElementById("submit-button");

async function generateFlashcards(topic) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "qwen/qwen3-32b",
            messages:[
                { role: "system", content: "You generate flashcard Q&A pairs as strict JSON arrays." },
                { role: "user", content: `Generate 10 flashcards about: ${topic}` }
            ]
        })
    })

    return response.json();
}

inputField.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitButton.click();
    }});

submitButton.addEventListener("click", async function() {
    const topic = inputField.value.trim();
    if (topic) {
        const flashcards = await generateFlashcards(topic);
        console.log(flashcards);
    } else {
        alert("Please enter a topic.");
    }});