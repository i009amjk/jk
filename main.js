const catalog = [
  { name: "Number Ninjas", category: "Math", icon: "＋", playable: true },
  { name: "Shape Shift", category: "Math", icon: "◇" },
  { name: "Fraction Forge", category: "Math", icon: "½" },
  { name: "Pattern Patrol", category: "Math", icon: "∿" },
  { name: "Measure Up", category: "Math", icon: "↔" },
  { name: "Decimal Dash", category: "Math", icon: "·" },
  { name: "Tiny Scientists", category: "Science", icon: "✦" },
  { name: "Planet Hopper", category: "Science", icon: "◉" },
  { name: "Eco Choices", category: "Science", icon: "♧" },
  { name: "Body Builder", category: "Science", icon: "♡" },
  { name: "Matter Mixer", category: "Science", icon: "◌" },
  { name: "Weather Watch", category: "Science", icon: "☼" },
  { name: "Word Weaver", category: "Language", icon: "Aa" },
  { name: "Story Sparks", category: "Language", icon: "✎" },
  { name: "Grammar Grove", category: "Language", icon: "¶" },
  { name: "Rhyme Time", category: "Language", icon: "♫" },
  { name: "Meaning Match", category: "Language", icon: "↔" },
  { name: "Reading Radar", category: "Language", icon: "◫" },
  { name: "Logic Locks", category: "Logic", icon: "▣" },
  { name: "Code Breakers", category: "Logic", icon: "</>" },
  { name: "Sequence Squad", category: "Logic", icon: "123" },
  { name: "Clue Crew", category: "Logic", icon: "?" },
  { name: "Route Riddle", category: "Logic", icon: "⌁" },
  { name: "Decision Tree", category: "Logic", icon: "⑂" },
  { name: "Memory Match", category: "Memory", icon: "▦" },
  { name: "Sound Safari", category: "Memory", icon: "◒" },
  { name: "Picture Recall", category: "Memory", icon: "▧" },
  { name: "Order Up", category: "Memory", icon: "≡" },
  { name: "Focus Flow", category: "Memory", icon: "◎" },
  { name: "Treasure Recall", category: "Memory", icon: "◇" }
];

const levelConfig = {
  1: { label: "WARM-UP", title: "Warm-up", time: 45, hint: "Warm-up mode: addition and subtraction up to 20." },
  2: { label: "MOMENTUM", title: "Momentum", time: 35, hint: "Momentum mode: multiplication, division, and mixed steps." },
  3: { label: "CHALLENGE", title: "Challenge", time: 30, hint: "Challenge mode: multi-step thinking and percentage patterns." }
};

const saved = JSON.parse(localStorage.getItem("learnquest-progress") || "{}");
const state = {
  screen: "home",
  level: 1,
  unlockedLevel: Math.min(3, Math.max(1, saved.unlockedLevel || 1)),
  questionIndex: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  total: 5,
  current: null,
  roundQuestions: [],
  secondsLeft: 45,
  timer: null,
  answerLocked: false,
  lastResult: { passed: false }
};

const $ = (id) => document.getElementById(id);
const screens = document.querySelectorAll(".screen");
const navLinks = document.querySelectorAll("[data-screen-link]");

function persist() {
  localStorage.setItem("learnquest-progress", JSON.stringify({
    unlockedLevel: state.unlockedLevel,
    bestStreak: Math.max(state.bestStreak, saved.bestStreak || 0)
  }));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeQuestion(level, index) {
  if (level === 1) {
    let a = randomInt(5, 20);
    let b = randomInt(2, 12);
    if (index % 2 === 0) return { text: `${a} + ${b} = ?`, answer: a + b };
    if (b > a) [a, b] = [b, a];
    return { text: `${a} − ${b} = ?`, answer: a - b };
  }

  if (level === 2) {
    if (index % 2 === 0) {
      const a = randomInt(3, 9);
      const b = randomInt(2, 8);
      return { text: `${a} × ${b} = ?`, answer: a * b };
    }
    const divisor = randomInt(2, 9);
    const answer = randomInt(2, 9);
    return { text: `${divisor * answer} ÷ ${divisor} = ?`, answer };
  }

  const type = index % 3;
  if (type === 0) {
    const a = randomInt(3, 8);
    const b = randomInt(2, 6);
    const c = randomInt(2, 5);
    return { text: `${a} + ${b} × ${c} = ?`, answer: a + b * c };
  }
  if (type === 1) {
    const percent = [10, 20, 25, 50][randomInt(0, 3)];
    const base = [20, 40, 60, 80, 100][randomInt(0, 4)];
    return { text: `${percent}% of ${base} = ?`, answer: (percent * base) / 100 };
  }
  const start = randomInt(2, 10);
  const step = randomInt(2, 6);
  return { text: `${start}, ${start + step}, ${start + step * 2}, ?`, answer: start + step * 3 };
}

function makeRound(level) {
  return Array.from({ length: 5 }, (_, index) => makeQuestion(level, index));
}

function updateHomeStats() {
  const bestLevel = state.unlockedLevel;
  $("homeBestLevel").textContent = bestLevel;
  $("homeBestStreak").textContent = Math.max(state.bestStreak, saved.bestStreak || 0);
  $("homeLevelChip").textContent = `LEVEL ${bestLevel}`;
  $("topbarLevel").textContent = `Level ${bestLevel} / 70+`;
}

function updateLadder() {
  const items = [$("ladderLevelTwo"), $("ladderLevelThree")];
  items.forEach((item, index) => {
    const level = index + 2;
    item.classList.toggle("unlocked", state.unlockedLevel >= level);
    item.querySelector(".ladder-state").textContent = state.unlockedLevel >= level ? "OPEN" : "LOCKED";
  });
}

function switchScreen(screen) {
  stopTimer();
  state.screen = screen;
  screens.forEach((item) => item.classList.toggle("active", item.id === `screen-${screen}`));
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.screenLink === screen));
  const context = { home: "Home base", game: "Math Sprint", results: "Round results", roadmap: "Quest map" }[screen];
  $("topbarContext").textContent = context;
  updateHomeStats();
  if (screen === "roadmap") renderRoadmap();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startGame(level = state.unlockedLevel) {
  state.level = Math.min(3, Math.max(1, level));
  state.questionIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.correct = 0;
  state.total = 5;
  state.secondsLeft = levelConfig[state.level].time;
  state.roundQuestions = makeRound(state.level);
  state.answerLocked = false;
  switchScreen("game");
  renderQuestion();
  startTimer();
}

function startTimer() {
  stopTimer();
  state.timer = setInterval(() => {
    state.secondsLeft -= 1;
    $("timerValue").textContent = state.secondsLeft;
    if (state.secondsLeft <= 0) finishRound(false);
  }, 1000);
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function renderQuestion() {
  const config = levelConfig[state.level];
  state.current = state.roundQuestions[state.questionIndex];
  $("gameLevelEyebrow").textContent = `LEVEL ${state.level}`;
  $("difficultyLabel").textContent = config.label;
  $("questionCount").textContent = `Question ${state.questionIndex + 1} of ${state.total}`;
  $("questionProgressFill").style.width = `${((state.questionIndex + 1) / state.total) * 100}%`;
  $("questionText").textContent = state.current.text;
  $("hintText").textContent = config.hint;
  $("scoreValue").textContent = state.score;
  $("streakValue").textContent = state.streak;
  $("levelValue").textContent = state.level;
  $("timerValue").textContent = state.secondsLeft;
  $("feedback").textContent = state.questionIndex === 0 ? "You’ve got this. Take a breath and go." : "Next one. Keep your rhythm.";
  $("feedback").className = "feedback";
  $("answerInput").value = "";
  state.answerLocked = false;
  window.setTimeout(() => $("answerInput").focus(), 80);
}

function submitAnswer(event) {
  event.preventDefault();
  if (state.answerLocked || !state.current) return;
  const answer = Number($("answerInput").value);
  if (!Number.isFinite(answer)) return;
  state.answerLocked = true;
  const isCorrect = answer === state.current.answer;
  const feedback = $("feedback");
  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.score += 100 * state.level + (state.streak - 1) * 25;
    feedback.textContent = state.streak > 1 ? `Nice — ${state.streak} in a row!` : "Correct. That idea is sticking.";
    feedback.className = "feedback good";
  } else {
    state.streak = 0;
    feedback.textContent = `Good try. The answer was ${state.current.answer}. Keep going.`;
    feedback.className = "feedback try";
  }
  $("scoreValue").textContent = state.score;
  $("streakValue").textContent = state.streak;
  window.setTimeout(() => {
    state.questionIndex += 1;
    if (state.questionIndex >= state.total) finishRound(true);
    else renderQuestion();
  }, 650);
}

function finishRound(completed) {
  if (state.screen !== "game") return;
  stopTimer();
  const passed = state.correct >= 3;
  if (passed && state.level === state.unlockedLevel && state.unlockedLevel < 3) state.unlockedLevel += 1;
  persist();
  state.lastResult = { passed, completed };
  renderResults();
  switchScreen("results");
}

function renderResults() {
  const { passed } = state.lastResult;
  const accuracy = `${state.correct}/${state.total}`;
  $("resultsMark").textContent = passed ? "✦" : "↗";
  $("resultsEyebrow").textContent = passed ? "LEVEL CLEARED" : "ROUND COMPLETE";
  $("resultsTitle").textContent = passed ? (state.level < 3 ? "You found your rhythm." : "Challenge accepted.") : "That’s a strong start.";
  $("resultsDescription").textContent = passed ? (state.level < 3 ? "A new level is open. The questions will get faster, but your confidence is already moving." : "You made it through the demo ladder. This is what 70+ levels can feel like.") : "Every attempt gives your brain another rep. Try again and aim for three correct answers.";
  $("resultsScore").textContent = state.score;
  $("resultsCorrect").textContent = accuracy;
  $("resultsStreak").textContent = state.bestStreak;
  $("resultsProgressText").textContent = `Level ${state.unlockedLevel} of 70+`;
  $("resultsProgressFill").style.width = `${Math.min(100, (state.unlockedLevel / 70) * 100)}%`;
  const nextButton = $("resultsNextButton");
  nextButton.innerHTML = passed && state.level < 3 ? `Try level ${state.level + 1} <span class="button-arrow">↗</span>` : `Try level ${state.level} again <span class="button-arrow">↗</span>`;
}

function renderRoadmap() {
  $("roadmapCount").textContent = `${catalog.length} quests mapped`;
  $("roadmapGrid").innerHTML = catalog.map((item, index) => `
    <article class="roadmap-card ${item.playable ? "playable" : ""}">
      <div class="roadmap-card-top"><span class="roadmap-icon">${item.icon}</span><span class="roadmap-index">${String(index + 1).padStart(2, "0")}</span></div>
      <strong>${item.name}</strong>
      <div class="roadmap-card-bottom"><span class="roadmap-category">${item.category}</span><span class="roadmap-status">${item.playable ? "PLAYABLE" : "PLANNED"}</span></div>
    </article>`).join("");
}

navLinks.forEach((link) => link.addEventListener("click", () => {
  const target = link.dataset.screenLink;
  if (target === "game") startGame();
  else switchScreen(target);
}));
$("startGameButton").addEventListener("click", () => startGame());
$("openRoadmapButton").addEventListener("click", () => switchScreen("roadmap"));
$("answerForm").addEventListener("submit", submitAnswer);
$("resultsNextButton").addEventListener("click", () => startGame(state.lastResult.passed && state.level < 3 ? state.level + 1 : state.level));
$("resultsHomeButton").addEventListener("click", () => switchScreen("home"));
$("resultsRoadmapButton").addEventListener("click", () => switchScreen("roadmap"));

updateLadder();
updateHomeStats();
renderRoadmap();

const menuButton = $("menuButton");
const menuOverlay = $("menuOverlay");
const mobileMenu = $("mobileMenu");

function closeMenu() {
  if (!menuButton || !menuOverlay || !mobileMenu) return;
  menuButton.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuOverlay.hidden = true;
  mobileMenu.hidden = true;
  document.body.classList.remove("menu-open");
}

function toggleMenu() {
  const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.classList.toggle("open", willOpen);
  menuButton.setAttribute("aria-expanded", String(willOpen));
  menuOverlay.hidden = !willOpen;
  mobileMenu.hidden = !willOpen;
  document.body.classList.toggle("menu-open", willOpen);
}

if (menuButton) menuButton.addEventListener("click", toggleMenu);
if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);
document.querySelectorAll(".mobile-menu [data-screen-link]").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
window.addEventListener("resize", () => { if (window.innerWidth > 720) closeMenu(); });
