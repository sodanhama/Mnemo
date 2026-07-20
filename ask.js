const model = "cohere/north-mini-code:free";

async function generateAnswer(question) {
    const response = await fetch("https://mnemo-ai-proxy.sodanhama.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: "You answer questions without markdown, formatting and extra text. Aim for a single paragraph." },
                { role: "user", content: question }
            ]
        })
    }).then(res => res.json());
    return response.choices[0].message.content;
}

const askMnemoField = document.getElementById("ask-mnemo-field");
const mnemoAnswerDiv = document.getElementById("mnemo-answer");

askMnemoField.addEventListener("keypress", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        askMnemoField.blur();
        askMnemoField.disabled = true;
        try {
            const question = askMnemoField.value.trim();
            const answer = await generateAnswer(question);
            const mnemoAnswer = document.createElement("p");
            mnemoAnswer.textContent = answer;
            mnemoAnswerDiv.innerHTML = "";
            mnemoAnswerDiv.appendChild(mnemoAnswer);
            askMnemoField.value = "";
            askMnemoField.disabled = false;
        } catch (error) {
            const mnemoAnswer = document.createElement("p");
            mnemoAnswer.textContent = "Error generating response: " + error.message;
            mnemoAnswerDiv.innerHTML = "";
            mnemoAnswerDiv.appendChild(mnemoAnswer);
            askMnemoField.disabled = false;
        }
    }
})