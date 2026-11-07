function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default class Quiz {
  constructor(category, difficulty, numberOfQuestions, playerName) {
    this.category = category;
    this.difficulty = difficulty;
    this.numberOfQuestions = numberOfQuestions;
    this.playerName = playerName;
    this.score = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
  }

  async getQuestions() {
    const url = this.buildApiUrl();
    const response = await fetch(url);

    if (response.status === 429) {
      throw new Error("Too many requests. Please wait 5 seconds and try again.");
    }
    if (!response.ok) {
      throw new Error("Failed to load questions. Please try again.");
    }

    const data = await response.json();

    if (data.response_code === 0) {
      this.questions = data.results;
      return this.questions;
    }
    if (data.response_code === 1) {
      throw new Error("Not enough questions for these settings. Try fewer rounds or another category.");
    }
    if (data.response_code === 5) {
      throw new Error("Too many requests. Please wait 5 seconds and try again.");
    }
    throw new Error("Failed to load questions. Please try again.");
  }

  buildApiUrl() {
    const params = new URLSearchParams();
    params.append("amount", this.numberOfQuestions);
    if (this.category) {
      params.append("category", this.category);
    }
    if (this.difficulty) {
      params.append("difficulty", this.difficulty);
    }
    return "https://opentdb.com/api.php?" + params.toString();
  }
  incrementScore() {
    this.score++;
  }

  getCurrentQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    return this.currentQuestionIndex < this.questions.length;
  }

  isComplete() {
    return this.currentQuestionIndex >= this.questions.length;
  }

  getScorePercentage() {
    return Math.round((this.score / this.numberOfQuestions) * 100);
  }

  getHighScores() {
    try {
      const saved = localStorage.getItem("quizHighScores");
      const scores = saved ? JSON.parse(saved) : [];
      return Array.isArray(scores) ? scores : [];
    } catch (error) {
      return [];
    }
  }

  saveHighScore() {
    const highScores = this.getHighScores();
    highScores.push({
      name: this.playerName,
      score: this.score,
      total: this.numberOfQuestions,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      date: new Date().toISOString(),
    });
    highScores.sort((a, b) => b.percentage - a.percentage);
    const top = highScores.slice(0, 10);
    try {
      localStorage.setItem("quizHighScores", JSON.stringify(top));
    } catch (error) {
      console.log("Could not save high score");
    }
  }

  isHighScore() {
    const highScores = this.getHighScores();
    if (highScores.length < 10) {
      return true;
    }
    const lowest = highScores[highScores.length - 1].percentage;
    return this.getScorePercentage() > lowest;
  }

  endQuiz() {
    const percentage = this.getScorePercentage();
    const isNewRecord = this.isHighScore();

    if (isNewRecord) {
      this.saveHighScore();
    }
    const highScores = this.getHighScores();

    const medals = ["gold", "silver", "bronze"];
    let leaderboardHTML = "";
    for (let i = 0; i < highScores.length; i++) {
      const medal = i < 3 ? " " + medals[i] : "";
      leaderboardHTML += `
          <li class="leaderboard-item${medal}">
            <span class="leaderboard-rank">#${i + 1}</span>
            <span class="leaderboard-name">${escapeHtml(highScores[i].name)}</span>
            <span class="leaderboard-score">${highScores[i].percentage}%</span>
          </li>`;
    }

    const recordBadge = isNewRecord
      ? `<div class="new-record-badge">
          <i class="fa-solid fa-star"></i> New High Score!
        </div>`
      : "";

    return `
      <div class="game-card results-card">
        <h2 class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.numberOfQuestions}</p>
        <p class="results-percentage">${percentage}% Accuracy</p>

        ${recordBadge}

        <div class="leaderboard">
          <h4 class="leaderboard-title">
            <i class="fa-solid fa-trophy"></i> Leaderboard
          </h4>
          <ul class="leaderboard-list">${leaderboardHTML}
          </ul>
        </div>

        <div class="action-buttons">
          <button class="btn-restart">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>`;
  }
}
