const state = {
  sections: window.PACKET.sections,
  questions: window.PACKET.sections.flatMap((section) =>
    section.questions.map((question) => ({ ...question, section }))
  ),
  current: 0,
  answers: {},
  review: new Set(),
  showKey: false,
};

const letters = ["A", "B", "C", "D", "E"];

const els = {
  grid: document.getElementById("questionGrid"),
  progressText: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  stimulusMeta: document.getElementById("stimulusMeta"),
  stimulusTitle: document.getElementById("stimulusTitle"),
  stimulusBody: document.getElementById("stimulusBody"),
  questionType: document.getElementById("questionType"),
  difficultyPill: document.getElementById("difficultyPill"),
  questionNumber: document.getElementById("questionNumber"),
  questionText: document.getElementById("questionText"),
  answerArea: document.getElementById("answerArea"),
  answerNote: document.getElementById("answerNote"),
  reviewBtn: document.getElementById("reviewBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  toggleKeyBtn: document.getElementById("toggleKeyBtn"),
  printBtn: document.getElementById("printBtn"),
  printAll: document.getElementById("printAll"),
};

function boot() {
  renderNav();
  bindControls();
  renderPrintAll();
  renderQuestion();
}

function bindControls() {
  els.prevBtn.addEventListener("click", () => {
    if (state.current > 0) {
      state.current -= 1;
      renderQuestion();
    }
  });

  els.nextBtn.addEventListener("click", () => {
    if (state.current < state.questions.length - 1) {
      state.current += 1;
      renderQuestion();
    }
  });

  els.reviewBtn.addEventListener("click", () => {
    const number = currentQuestion().number;
    if (state.review.has(number)) state.review.delete(number);
    else state.review.add(number);
    renderQuestion();
    renderNav();
  });

  els.toggleKeyBtn.addEventListener("click", () => {
    state.showKey = !state.showKey;
    els.toggleKeyBtn.classList.toggle("active", state.showKey);
    renderQuestion();
  });

  els.printBtn.addEventListener("click", () => {
    renderPrintAll();
    window.print();
  });

  window.addEventListener("beforeprint", renderPrintAll);
}

function currentQuestion() {
  return state.questions[state.current];
}

function renderNav() {
  els.grid.innerHTML = "";
  state.questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.className = "number-button";
    button.textContent = question.number;
    button.setAttribute("aria-label", "Soal " + question.number);
    if (index === state.current) button.classList.add("active");
    if (state.answers[question.number]) button.classList.add("answered");
    if (state.review.has(question.number)) button.classList.add("review");
    button.addEventListener("click", () => {
      state.current = index;
      renderQuestion();
    });
    els.grid.appendChild(button);
  });
}

function renderQuestion() {
  const question = currentQuestion();
  els.stimulusMeta.textContent = question.section.header;
  els.stimulusTitle.textContent = question.section.title;
  els.stimulusBody.innerHTML = question.section.stimulus.map((paragraph) => "<p>" + escapeHtml(paragraph) + "</p>").join("");
  els.questionType.textContent = question.type;
  els.difficultyPill.textContent = question.difficulty;
  els.questionNumber.textContent = "Soal " + question.number;
  els.questionText.textContent = question.prompt;
  els.reviewBtn.classList.toggle("active", state.review.has(question.number));
  els.reviewBtn.textContent = state.review.has(question.number) ? "Hapus tanda ragu-ragu" : "Tandai ragu-ragu";

  if (question.type === "Benar/Salah") renderTrueFalse(question);
  else renderChoiceQuestion(question);

  renderAnswerNote(question);
  renderNav();
  updateProgress();
  els.prevBtn.disabled = state.current === 0;
  els.nextBtn.disabled = state.current === state.questions.length - 1;
}

function renderChoiceQuestion(question) {
  const saved = state.answers[question.number] || (question.type === "MCMA" ? [] : "");
  els.answerArea.innerHTML = "";
  question.options.forEach((option) => {
    const label = document.createElement("label");
    label.className = "option";
    const input = document.createElement("input");
    input.type = question.type === "MCMA" ? "checkbox" : "radio";
    input.name = "q" + question.number;
    input.value = option.letter;
    input.checked = question.type === "MCMA" ? saved.includes(option.letter) : saved === option.letter;
    input.addEventListener("change", () => {
      if (question.type === "MCMA") {
        const next = new Set(state.answers[question.number] || []);
        if (input.checked) next.add(option.letter);
        else next.delete(option.letter);
        state.answers[question.number] = [...next].sort();
      } else {
        state.answers[question.number] = option.letter;
      }
      renderNav();
      updateProgress();
    });
    label.append(input, optionBadge(option.letter), document.createTextNode(option.text));
    els.answerArea.appendChild(label);
  });
}

function renderTrueFalse(question) {
  const saved = state.answers[question.number] || {};
  const table = document.createElement("table");
  table.className = "bs-table";
  table.innerHTML = "<thead><tr><th>No.</th><th>Pernyataan</th><th>Benar</th><th>Salah</th></tr></thead>";
  const body = document.createElement("tbody");
  question.statements.forEach((statement) => {
    const row = document.createElement("tr");
    row.innerHTML = "<td>" + statement.number + "</td><td>" + escapeHtml(statement.text) + "</td>";
    ["B", "S"].forEach((value) => {
      const cell = document.createElement("td");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "q" + question.number + "-" + statement.number;
      input.value = value;
      input.checked = saved[statement.number] === value;
      input.addEventListener("change", () => {
        state.answers[question.number] = { ...(state.answers[question.number] || {}), [statement.number]: value };
        renderNav();
        updateProgress();
      });
      cell.appendChild(input);
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  table.appendChild(body);
  els.answerArea.innerHTML = "";
  els.answerArea.appendChild(table);
}

function optionBadge(letter) {
  const span = document.createElement("span");
  span.className = "option-letter";
  span.textContent = letter;
  return span;
}

function renderAnswerNote(question) {
  if (!state.showKey) {
    els.answerNote.classList.add("hidden");
    els.answerNote.innerHTML = "";
    return;
  }
  els.answerNote.classList.remove("hidden");
  const explanation = window.EXPLANATIONS[question.number] || question.analysis || "";
  els.answerNote.innerHTML = [
    "<strong>Kunci: " + escapeHtml(question.key) + "</strong>",
    "<p>" + escapeHtml(explanation).replace(/\n/g, "<br>") + "</p>",
  ].join("");
}

function updateProgress() {
  const answered = state.questions.filter((question) => isAnswered(question)).length;
  els.progressText.textContent = answered + "/" + state.questions.length;
  els.progressFill.style.width = (answered / state.questions.length) * 100 + "%";
}

function isAnswered(question) {
  const answer = state.answers[question.number];
  if (!answer) return false;
  if (question.type === "MCMA") return Array.isArray(answer) && answer.length > 0;
  if (question.type === "Benar/Salah") return question.statements.every((statement) => answer[statement.number]);
  return Boolean(answer);
}

function renderPrintAll() {
  const sectionsHtml = state.sections
    .map((section) => {
      const questions = section.questions.map(renderPrintQuestion).join("");
      const numbers = section.questions.map((question) => question.number);
      return '<section class="print-section"><p class="print-instruction">Bacalah teks berikut untuk menjawab soal nomor ' +
        Math.min(...numbers) + "-" + Math.max(...numbers) + '!</p><h2>' + escapeHtml(section.title) +
        '</h2><div class="print-stimulus">' + section.stimulus.map((p) => "<p>" + escapeHtml(p) + "</p>").join("") +
        "</div>" + questions + "</section>";
    })
    .join("");

  const discussionHtml = state.questions
    .map((question) => {
      const explanation = window.EXPLANATIONS[question.number] || question.analysis || "";
      return '<div class="print-explanation"><p><strong>Soal ' + question.number + '</strong></p><p><strong>Jawaban:</strong> ' +
        escapeHtml(question.key) + '</p><p><strong>Pembahasan:</strong> ' + escapeHtml(explanation).replace(/\n/g, "<br>") +
        "</p></div>";
    })
    .join("");

  els.printAll.innerHTML = '<div class="print-header"><h1>PAKET PREDIKSI</h1><p>Tes Kemampuan Akademik Bahasa Indonesia SMA</p></div>' +
    sectionsHtml + '<section class="print-discussion"><h2>Pembahasan Prediksi Soal TKA Bahasa Indonesia SMA</h2>' +
    discussionHtml + "</section>";
}

function renderPrintQuestion(question) {
  if (question.type === "Benar/Salah") {
    return '<div class="print-question"><p class="print-question-text">' + question.number + ". " + escapeHtml(question.prompt) +
      '</p><table class="print-bs-table"><thead><tr><th>No.</th><th>Pernyataan</th><th>Benar</th><th>Salah</th></tr></thead><tbody>' +
      question.statements.map((statement) => '<tr><td>' + statement.number + '</td><td>' + escapeHtml(statement.text) +
        "</td><td></td><td></td></tr>").join("") + "</tbody></table></div>";
  }
  return '<div class="print-question"><p class="print-question-text">' + question.number + ". " + escapeHtml(question.prompt) +
    '</p><ol class="print-options" type="A">' + question.options.map((option) => "<li>" + escapeHtml(option.text) + "</li>").join("") +
    "</ol></div>";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot();
