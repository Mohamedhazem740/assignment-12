let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioClass) {
      return null;
    }
    audioContext = new AudioClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(frequency, startAfter, duration, type) {
  const context = getAudioContext();
  if (!context) {
    return;
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + startAfter;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function playCorrectSound() {
  playTone(660, 0, 0.15, "sine");
  playTone(880, 0.12, 0.25, "sine");
}

function playWrongSound() {
  playTone(180, 0, 0.3, "sawtooth");
  playTone(130, 0.15, 0.35, "sawtooth");
}

function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default class Question {
  constructor(quiz, container, onQuizEnd) {
    this.quiz = quiz;
    this.container = container;
    this.onQuizEnd = onQuizEnd;

    this.questionData = quiz.getCurrentQuestion();
    this.index = quiz.currentQuestionIndex;

    this.question = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category = this.decodeHtml(this.questionData.category);
    this.wrongAnswers = this.questionData.incorrect_answers.map((answer) =>
      this.decodeHtml(answer)
    );
    this.allAnswers = this.shuffleAnswers();

    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = 15;
    this.handleKeydown = this.handleKeydown.bind(this);
  }
  decodeHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent;
  }

  shuffleAnswers() {
    if (this.questionData.type === "boolean") {
      return ["False", "True"];
    }
    const answers = [...this.wrongAnswers, this.correctAnswer];
    // Fisher-Yates
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    return answers;
  }

  getProgress() {
    return Math.round(((this.index + 1) / this.quiz.numberOfQuestions) * 100);
  }

  displayQuestion() {
    const difficulty = this.quiz.difficulty;
    const difficultyIcons = {
      easy: "fa-face-smile",
      medium: "fa-face-meh",
      hard: "fa-skull",
    };
    const round = this.index + 1;
    const total = this.quiz.numberOfQuestions;

    let answersHTML = "";
    for (let i = 0; i < this.allAnswers.length; i++) {
      answersHTML += `
        <button class="answer-btn" data-answer="${escapeHtml(this.allAnswers[i])}">
          <span class="answer-key">${i + 1}</span>
          <span class="answer-text">${escapeHtml(this.allAnswers[i])}</span>
        </button>`;
    }

    this.container.innerHTML = `
      <div class="game-card question-card">

        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span>
            <span class="xp-value">Round ${round}/${total}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width: ${this.getProgress()}%"></div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${escapeHtml(this.category)}</span>
          </div>
          <div class="stat-badge difficulty ${difficulty}">
            <i class="fa-solid ${difficultyIcons[difficulty]}"></i>
            <span>${difficulty}</span>
          </div>
          <div class="stat-badge timer">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeRemaining}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${round}/${total}</span>
          </div>
        </div>

        <h2 class="question-text">${escapeHtml(this.question)}</h2>

        <div class="answers-grid">${answersHTML}
        </div>

        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i> Press 1-${this.allAnswers.length} to select
        </p>

        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${this.quiz.score}</div>
          </div>
        </div>
      </div>`;

    this.addEventListeners();
    this.startTimer();
  }
  addEventListeners() {
    const buttons = this.container.querySelectorAll(".answer-btn");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", () => {
        this.checkAnswer(buttons[i]);
      });
    }
    document.addEventListener("keydown", this.handleKeydown);
  }

  removeEventListeners() {
    document.removeEventListener("keydown", this.handleKeydown);
  }
  handleKeydown(event) {
    const validKeys = ["1", "2", "3", "4"];
    if (!validKeys.includes(event.key)) {
      return;
    }
    const buttons = this.container.querySelectorAll(".answer-btn");
    const button = buttons[parseInt(event.key) - 1];
    if (button) {
      this.checkAnswer(button);
    }
  }

  startTimer() {
    const timerBadge = this.container.querySelector(".stat-badge.timer");
    const timerValue = this.container.querySelector(".timer-value");

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      timerValue.textContent = this.timeRemaining;
      if (this.timeRemaining <= 5) {
        timerBadge.classList.add("warning");
      }
      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.handleTimeUp();
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  handleTimeUp() {
    this.answered = true;
    this.removeEventListeners();
    playWrongSound();
    const buttons = this.container.querySelectorAll(".answer-btn");
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute("data-answer").toLowerCase() === this.correctAnswer.toLowerCase()) {
        buttons[i].classList.add("correct");
      } else {
        buttons[i].classList.add("disabled");
      }
    }

    const hint = this.container.querySelector(".keyboard-hint");
    hint.insertAdjacentHTML(
      "beforebegin",
      `<div class="time-up-message"><i class="fa-solid fa-clock"></i> TIME'S UP!</div>`
    );

    this.animateQuestion();
  }
  checkAnswer(choiceElement) {
    if (this.answered) {
      return;
    }
    this.answered = true;
    this.stopTimer();
    this.removeEventListeners();

    const selected = choiceElement.getAttribute("data-answer");
    const isCorrect = selected.toLowerCase() === this.correctAnswer.toLowerCase();

    if (isCorrect) {
      choiceElement.classList.add("correct");
      this.quiz.incrementScore();
      playCorrectSound();
      this.container.querySelector(".score-item-value").textContent = this.quiz.score;
    } else {
      choiceElement.classList.add("wrong");
      this.highlightCorrectAnswer();
      playWrongSound();
    }

    const buttons = this.container.querySelectorAll(".answer-btn");
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i] !== choiceElement && !buttons[i].classList.contains("correct-reveal")) {
        buttons[i].classList.add("disabled");
      }
    }

    this.animateQuestion();
  }

  highlightCorrectAnswer() {
    const buttons = this.container.querySelectorAll(".answer-btn");
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute("data-answer").toLowerCase() === this.correctAnswer.toLowerCase()) {
        buttons[i].classList.add("correct-reveal");
      }
    }
  }

  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      const nextQuestion = new Question(this.quiz, this.container, this.onQuizEnd);
      nextQuestion.displayQuestion();
    } else {
      this.container.innerHTML = this.quiz.endQuiz();
      const playAgainBtn = this.container.querySelector(".btn-restart");
      playAgainBtn.addEventListener("click", () => {
        this.onQuizEnd();
      });
    }
  }

  async animateQuestion(duration = 400) {
    await wait(1500);
    const card = this.container.querySelector(".question-card");
    if (card) {
      card.classList.add("exit");
    }
    await wait(duration);
    this.getNextQuestion();
  }
}
