const bottomNav = document.querySelector(".bottom-nav");
const navbar = document.querySelector(".navbar");
const pageViews = [...document.querySelectorAll(".page-view[data-page]")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let transitionTimeout;

navbar.addEventListener("animationend", (event) => {
    if (event.pseudoElement === "::after" && event.animationName === "navbar-blur-rise") {
        navbar.classList.remove("is-blurring");
    }
});

function showPage(viewName) {
    const nextView = pageViews.find((view) => view.dataset.page === viewName);
    if (!nextView) return;

    const activeView = document.querySelector(".page-view--active");
    if (activeView === nextView) return;

    navbar.classList.remove("is-blurring");
    void navbar.offsetWidth;
    navbar.classList.add("is-blurring");

    window.clearTimeout(transitionTimeout);
    pageViews.forEach((view) => {
        if (view.classList.contains("page-view--leaving")) {
            view.hidden = true;
            view.classList.remove("page-view--leaving");
        }
    });

    if (activeView) {
        activeView.classList.remove("page-view--active");
        activeView.classList.add("page-view--leaving");
    }

    nextView.hidden = false;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => nextView.classList.add("page-view--active"));
    });

    if (activeView) {
        transitionTimeout = window.setTimeout(() => {
            activeView.hidden = true;
            activeView.classList.remove("page-view--leaving");
        }, prefersReducedMotion.matches ? 0 : 300);
    }
}

const createOverlay = document.querySelector(".create-overlay");
const createForm = document.querySelector(".create-form");
const questionInput = createForm.querySelector("textarea");
const questionCount = createForm.querySelector("[data-question-count]");
const designOptions = [...createForm.querySelectorAll(".design-option")];
const designOptionsContainer = createForm.querySelector(".design-options");
const publicationOptions = [...createForm.querySelectorAll(".publication-option")];
const homeQuestionList = document.querySelector('[data-page="home"] .question-list');
const trendSection = document.querySelector(".trending-questions");
const trendList = trendSection.querySelector(".trend-question-list");
const trendCards = [...trendList.querySelectorAll(".trend-card")];
const trendSearch = trendSection.querySelector(".trend-search input");
const trendFilters = [...trendSection.querySelectorAll(".trend-filter")];
const trendEmpty = trendSection.querySelector(".trend-empty");
const createStorageKey = "afterme-created-questions";
const availableBackgrounds = new Set(designOptions.map((option) => option.dataset.background));
let selectedBackground = designOptions[0].dataset.background;
let selectedVisibility = "public";
let previouslyFocusedElement;
let activeTrendFilter = "all";

function createFireIcon() {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(svgNamespace, "svg");
    icon.classList.add("trend-fire-icon");
    icon.setAttribute("viewBox", "-33 0 255 255");
    icon.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(svgNamespace, "use");
    use.setAttribute("href", "#icon-fire");
    icon.append(use);
    return icon;
}

function finishCreateClose() {
    createOverlay.hidden = true;
    createOverlay.setAttribute("aria-hidden", "true");
    createOverlay.classList.remove("is-opening", "is-closing");
    document.body.classList.remove("is-creating");
    if (previouslyFocusedElement instanceof HTMLElement) previouslyFocusedElement.focus();
}

function openCreate() {
    previouslyFocusedElement = document.activeElement;
    createForm.reset();
    questionCount.textContent = "0";
    questionInput.setCustomValidity("");
    designOptionsContainer.scrollLeft = 0;
    selectedBackground = designOptions[0].dataset.background;
    selectedVisibility = "public";
    designOptions.forEach((option, index) => {
        const selected = index === 0;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-pressed", String(selected));
    });
    publicationOptions.forEach((option) => {
        const selected = option.dataset.visibility === "public";
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-pressed", String(selected));
    });
    createOverlay.hidden = false;
    createOverlay.setAttribute("aria-hidden", "false");
    createOverlay.classList.remove("is-closing");
    document.body.classList.add("is-creating");
    requestAnimationFrame(() => {
        createOverlay.classList.add("is-opening");
        questionInput.focus({ preventScroll: true });
    });
}

function closeCreate() {
    if (createOverlay.hidden || createOverlay.classList.contains("is-closing")) return;
    createOverlay.classList.remove("is-opening");
    createOverlay.classList.add("is-closing");
    if (prefersReducedMotion.matches) finishCreateClose();
}

createOverlay.addEventListener("animationend", (event) => {
    if (event.target === createOverlay && event.animationName === "create-screen-exit") {
        finishCreateClose();
    } else if (event.target === createOverlay && event.animationName === "create-screen-enter") {
        createOverlay.classList.remove("is-opening");
    }
});

createOverlay.querySelectorAll("[data-close-create]").forEach((button) => {
    button.addEventListener("click", closeCreate);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !createOverlay.hidden) closeCreate();
});

questionInput.addEventListener("input", () => {
    questionCount.textContent = String(questionInput.value.length);
    questionInput.setCustomValidity("");
});

designOptions.forEach((option) => {
    option.addEventListener("click", () => {
        selectedBackground = option.dataset.background;
        designOptions.forEach((candidate) => {
            const selected = candidate === option;
            candidate.classList.toggle("is-selected", selected);
            candidate.setAttribute("aria-pressed", String(selected));
        });
    });
});

publicationOptions.forEach((option) => {
    option.addEventListener("click", () => {
        selectedVisibility = option.dataset.visibility;
        publicationOptions.forEach((candidate) => {
            const selected = candidate === option;
            candidate.classList.toggle("is-selected", selected);
            candidate.setAttribute("aria-pressed", String(selected));
        });
    });
});

function isStoredQuestion(question) {
    return question
        && typeof question.text === "string"
        && question.text.trim().length > 0
        && question.text.length <= 300
        && availableBackgrounds.has(question.background)
        && ["public", "link"].includes(question.visibility)
        && Number.isFinite(question.created);
}

function createStatIcon(symbol) {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(svgNamespace, "svg");
    icon.classList.add("question-item__stat-icon");
    icon.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(svgNamespace, "use");
    use.setAttribute("href", `#icon-${symbol}`);
    icon.append(use);
    return icon;
}

function createQuestionCard(question, isTrend = false) {
    const card = document.createElement("article");
    card.className = `question-item${isTrend ? " trend-card" : ""}`;
    if (isTrend) {
        card.dataset.comments = "0";
        card.dataset.created = String(question.created);
        const badge = document.createElement("span");
        badge.className = "trend-card__badge";
        badge.append(createFireIcon(), document.createTextNode("Тренд"));
        card.append(badge);
    }

    const art = document.createElement("img");
    art.className = "question-item__art";
    art.src = `./assets/bg/${question.background}`;
    art.alt = "";
    card.prepend(art);

    const author = document.createElement("div");
    author.className = "question-item__author";
    const avatar = document.createElement("img");
    avatar.src = "./assets/profile-placeholder.png";
    avatar.alt = "";
    avatar.className = "question-item__avatar";
    author.append(avatar);

    const visibility = document.createElement("span");
    visibility.className = isTrend ? "trend-card__username" : "question-item__visibility";
    visibility.textContent = isTrend ? "@you" : question.visibility === "public" ? "Публичный" : "По ссылке";
    author.append(visibility);
    card.append(author);

    const title = document.createElement("h3");
    title.textContent = question.text;
    card.append(title);

    const stats = document.createElement("div");
    stats.className = "question-item__stats";
    const comments = document.createElement("span");
    comments.append(createStatIcon("comment"), document.createTextNode("0"));
    const views = document.createElement("span");
    views.append(createStatIcon("views"), document.createTextNode("0"));
    stats.append(comments, views);
    card.append(stats);
    return card;
}

function insertQuestion(question) {
    homeQuestionList.prepend(createQuestionCard(question));
    if (question.visibility === "public") {
        const trendCard = createQuestionCard(question, true);
        trendList.prepend(trendCard);
        trendCards.unshift(trendCard);
        updateTrendResults();
    }
}

let savedQuestions = [];
try {
    const storedQuestions = JSON.parse(localStorage.getItem(createStorageKey) || "[]");
    if (Array.isArray(storedQuestions)) {
        savedQuestions = storedQuestions.filter(isStoredQuestion);
        savedQuestions.forEach(insertQuestion);
    }
} catch (error) {
    console.error("Could not load saved AfterMe questions.", error);
}

createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = questionInput.value.trim();
    if (!text) {
        questionInput.setCustomValidity("Введите текст вопроса.");
        questionInput.reportValidity();
        return;
    }

    const question = {
        text,
        background: selectedBackground,
        visibility: selectedVisibility,
        created: Date.now()
    };
    savedQuestions.push(question);
    insertQuestion(question);
    try {
        localStorage.setItem(createStorageKey, JSON.stringify(savedQuestions));
    } catch (error) {
        console.error("Could not persist the new AfterMe question.", error);
    }

    const homeButton = bottomNav.querySelector('[data-view="home"]');
    bottomNav.querySelectorAll(".nav-button[aria-current]").forEach((button) => {
        button.removeAttribute("aria-current");
    });
    homeButton.setAttribute("aria-current", "page");
    showPage("home");
    closeCreate();
});

bottomNav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-button");
    if (!button) return;
    if (button.matches("[data-open-create]")) {
        openCreate();
        return;
    }
    if (!button.querySelector(".nav-icon")) return;

    bottomNav.querySelectorAll(".nav-button[aria-current]").forEach((activeButton) => {
        activeButton.removeAttribute("aria-current");
    });
    button.setAttribute("aria-current", "page");

    if (button.dataset.view) {
        showPage(button.dataset.view);
    }
});

function updateTrendResults() {
    const query = trendSearch.value.trim().toLocaleLowerCase("ru");
    const matchingCards = trendCards.filter((card) =>
        card.textContent.toLocaleLowerCase("ru").includes(query)
    );

    matchingCards.sort((first, second) => {
        if (activeTrendFilter === "popular") {
            return Number(second.dataset.comments) - Number(first.dataset.comments);
        }

        if (activeTrendFilter === "recent") {
            return Number(second.dataset.created) - Number(first.dataset.created);
        }

        return trendCards.indexOf(first) - trendCards.indexOf(second);
    });

    matchingCards.forEach((card) => trendList.append(card));
    trendCards.forEach((card) => {
        card.hidden = !matchingCards.includes(card);
    });
    trendEmpty.hidden = matchingCards.length > 0;
}

trendSearch.addEventListener("input", updateTrendResults);

trendFilters.forEach((filterButton) => {
    filterButton.addEventListener("click", () => {
        activeTrendFilter = filterButton.dataset.filter;
        trendFilters.forEach((button) => {
            const isActive = button === filterButton;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
        updateTrendResults();
    });
});
