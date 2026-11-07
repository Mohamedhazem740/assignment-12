import Quiz from "./quiz.js";
import Question from "./question.js";

const quizOptionsForm = document.getElementById("quizOptions");
const playerNameInput = document.getElementById("playerName");
const categoryInput = document.getElementById("categoryMenu");
const difficultyOptions = document.getElementById("difficultyOptions");
const questionsNumber = document.getElementById("questionsNumber");
const startQuizBtn = document.getElementById("startQuiz");
const questionsContainer = document.querySelector(".questions-container");

let currentQuiz = null;

function setupForm() {
  const labels = quizOptionsForm.querySelectorAll(".form-label");
  labels[1].innerHTML = `<i class="fa-solid fa-layer-group"></i> Select Arena`;
  labels[3].innerHTML = `<i class="fa-solid fa-bolt"></i> Number of Rounds`;
  questionsNumber.setAttribute("placeholder", "Enter 1-50 rounds");

  const numberWrapper = quizOptionsForm.querySelector(".number-input-wrapper");
  numberWrapper.insertAdjacentHTML(
    "afterend",
    `<p class="form-hint">More rounds = More XP potential!</p>`
  );

  const categories = [
    { value: "", icon: "fa-shuffle", name: "Random Category" },
    { value: "9", icon: "fa-brain", name: "General Knowledge" },
    { value: "27", icon: "fa-paw", name: "Animals" },
    { value: "19", icon: "fa-calculator", name: "Mathematics" },
    { value: "18", icon: "fa-laptop-code", name: "Computers" },
    { value: "22", icon: "fa-earth-americas", name: "Geography" },
    { value: "21", icon: "fa-futbol", name: "Sports" },
    { value: "23", icon: "fa-landmark", name: "History" },
    { value: "17", icon: "fa-flask", name: "Science & Nature" },
    { value: "11", icon: "fa-film", name: "Film" },
    { value: "12", icon: "fa-music", name: "Music" },
    { value: "14", icon: "fa-tv", name: "Television" },
    { value: "15", icon: "fa-gamepad", name: "Video Games" },
  ];

  let optionsHTML = "";
  for (let i = 0; i < categories.length; i++) {
    optionsHTML += `
      <div class="custom-select-option" data-value="${categories[i].value}">
        <i class="fa-solid ${categories[i].icon}"></i> ${categories[i].name}
      </div>`;
  }
  document.querySelector("#categorySelect .custom-select-options").innerHTML = optionsHTML;
}

function showLoading() {
  questionsContainer.innerHTML = `
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>`;
}

function hideLoading() {
  const overlay = document.querySelector(".loading-overlay");
  if (overlay) {
    overlay.remove();
  }
}

function showError(message) {
  questionsContainer.innerHTML = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message">${message}</p>
      <button class="btn-play retry-btn">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>`;
  document.querySelector(".retry-btn").addEventListener("click", resetToStart);
}

function validateForm() {
  const value = questionsNumber.value.trim();

  if (value === "") {
    return { isValid: false, error: "Please enter the number of rounds." };
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return { isValid: false, error: "Please enter a whole number of rounds." };
  }
  if (number < 1) {
    return { isValid: false, error: "Minimum is 1 round." };
  }
  if (number > 50) {
    return { isValid: false, error: "Maximum is 50 rounds." };
  }
  return { isValid: true, error: null };
}

function showFormError(message) {
  const oldError = quizOptionsForm.querySelector(".form-error");
  if (oldError) {
    oldError.remove();
  }

  const errorDiv = document.createElement("div");
  errorDiv.className = "form-error";
  errorDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
  quizOptionsForm.insertBefore(errorDiv, startQuizBtn);

  setTimeout(function () {
    errorDiv.style.transition = "opacity 0.3s ease";
    errorDiv.style.opacity = "0";
    setTimeout(function () {
      errorDiv.remove();
    }, 300);
  }, 3000);
}

function resetToStart() {
  questionsContainer.innerHTML = "";
  quizOptionsForm.classList.remove("hidden");
  currentQuiz = null;
}

async function startQuiz() {
  const validation = validateForm();
  if (!validation.isValid) {
    showFormError(validation.error);
    return;
  }

  const playerName = playerNameInput.value.trim() || "Player";
  const category = categoryInput.value;
  const difficulty = difficultyOptions.value;
  const numberOfQuestions = parseInt(questionsNumber.value);

  currentQuiz = new Quiz(category, difficulty, numberOfQuestions, playerName);

  quizOptionsForm.classList.add("hidden");
  showLoading();

  try {
    await currentQuiz.getQuestions();
    hideLoading();

    if (currentQuiz.questions.length > 0) {
      const firstQuestion = new Question(currentQuiz, questionsContainer, resetToStart);
      firstQuestion.displayQuestion();
    } else {
      showError("No questions found. Please try different settings.");
    }
  } catch (error) {
    hideLoading();
    showError(error.message);
  }
}

startQuizBtn.addEventListener("click", startQuiz);

questionsNumber.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    startQuiz();
  }
});

setupForm();
