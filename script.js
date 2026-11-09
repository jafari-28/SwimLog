const form = document.querySelector("#trainingForm");
const meldung = document.querySelector("#meldung");
const trainingListe = document.querySelector("#trainingListe");
const submitButton = document.querySelector("#submitButton");
const reloadButton = document.querySelector("#reloadButton");
const datumFeld = document.querySelector("#datum");

// Standardmässig das heutige Datum einsetzen.
datumFeld.value = new Date().toISOString().split("T")[0];

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    // Zum Testen / für den Auftrag: Formularwerte in der Konsole ausgeben.
    console.log("Formulardaten:", Object.fromEntries(formData.entries()));

    setMessage("", "");
    submitButton.disabled = true;
    submitButton.textContent = "Wird gespeichert …";

    try {
        const response = await fetch("api.php", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Das Training konnte nicht gespeichert werden.");
        }

        setMessage(data.message, "success");
        form.reset();
        datumFeld.value = new Date().toISOString().split("T")[0];
        await loadTrainings();
    } catch (error) {
        setMessage(error.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Training speichern";
    }
});

reloadButton.addEventListener("click", loadTrainings);

async function loadTrainings() {
    trainingListe.innerHTML = '<p class="empty-state">Trainings werden geladen …</p>';

    try {
        const response = await fetch("api.php");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Trainings konnten nicht geladen werden.");
        }

        renderTrainings(data.trainings);
    } catch (error) {
        trainingListe.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
}

function renderTrainings(trainings) {
    if (trainings.length === 0) {
        trainingListe.innerHTML = '<p class="empty-state">Noch keine Trainings gespeichert.</p>';
        return;
    }

    trainingListe.innerHTML = trainings.map((training) => {
        const note = training.notiz
            ? `<p class="training-note">${escapeHtml(training.notiz)}</p>`
            : "";

        return `
            <article class="training-item">
                <div class="training-date">${formatDate(training.datum)}</div>
                <div class="training-info">
                    <strong>${escapeHtml(training.schwimmart)}</strong>
                    <p class="training-meta">${Number(training.distanz).toLocaleString("de-CH")} m · ${Number(training.dauer)} min</p>
                    ${note}
                </div>
                <span class="intensity">${escapeHtml(training.intensitaet)}</span>
            </article>
        `;
    }).join("");
}

function setMessage(text, type) {
    meldung.textContent = text;
    meldung.className = "meldung";

    if (text && type) {
        meldung.classList.add("show", type);
    }
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-");
    return `${day}.${month}.${year}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadTrainings();
