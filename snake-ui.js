const {
    GRID_SIZE,
    TICK_MS,
    changeDirection,
    createInitialState,
    restartGame,
    setRunning,
    stepGame
} = window.SnakeLogic;

const board = document.getElementById("game-board");
const scoreValue = document.getElementById("score");
const statusValue = document.getElementById("status");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayAction = document.getElementById("overlay-action");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const restartButton = document.getElementById("restart-button");
const directionButtons = document.querySelectorAll("[data-direction]");

let state = createInitialState();
let tickHandle = null;

buildBoard();
render();

document.addEventListener("keydown", handleKeydown);
startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", resetGame);
overlayAction.addEventListener("click", () => {
    if (state.isGameOver || !state.hasStarted) {
        resetGame();
        return;
    }

    startGame();
});

directionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        queueDirection(button.dataset.direction);
    });
});

function buildBoard() {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
        const cell = document.createElement("div");
        cell.className = "cell";
        fragment.appendChild(cell);
    }

    board.appendChild(fragment);
}

function render() {
    const cells = board.children;

    for (const cell of cells) {
        cell.className = "cell";
    }

    state.snake.forEach((segment, index) => {
        const cell = getCell(segment.x, segment.y);
        if (!cell) {
            return;
        }

        cell.classList.add("snake");
        if (index === 0) {
            cell.classList.add("head");
        }
    });

    if (state.food) {
        const foodCell = getCell(state.food.x, state.food.y);
        foodCell?.classList.add("food");
    }

    scoreValue.textContent = String(state.score);
    statusValue.textContent = getStatusText();
    pauseButton.textContent = state.isRunning ? "Pause" : "Resume";

    if (state.isGameOver) {
        overlay.hidden = false;
        overlayTitle.textContent = "Game Over";
        overlayMessage.textContent = `Final score: ${state.score}. Press restart to try again.`;
        overlayAction.textContent = "Restart Game";
    } else if (!state.hasStarted) {
        overlay.hidden = false;
        overlayTitle.textContent = "Press Start";
        overlayMessage.textContent = "Use arrow keys or WASD to control the snake.";
        overlayAction.textContent = "Start Game";
    } else if (!state.isRunning) {
        overlay.hidden = false;
        overlayTitle.textContent = "Paused";
        overlayMessage.textContent = "Press resume or space to continue.";
        overlayAction.textContent = "Resume";
    } else {
        overlay.hidden = true;
    }
}

function getCell(x, y) {
    return board.children[(y * GRID_SIZE) + x] ?? null;
}

function getStatusText() {
    if (state.isGameOver) {
        return "Over";
    }

    if (!state.hasStarted) {
        return "Ready";
    }

    return state.isRunning ? "Playing" : "Paused";
}

function handleKeydown(event) {
    const direction = mapKeyToDirection(event.key);

    if (direction) {
        event.preventDefault();
        if (!state.hasStarted) {
            startGame();
        }
        queueDirection(direction);
        return;
    }

    if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        if (!state.hasStarted || state.isGameOver) {
            resetGame();
            return;
        }

        togglePause();
    }
}

function mapKeyToDirection(key) {
    const normalized = key.toLowerCase();

    switch (normalized) {
        case "arrowup":
        case "w":
            return "up";
        case "arrowdown":
        case "s":
            return "down";
        case "arrowleft":
        case "a":
            return "left";
        case "arrowright":
        case "d":
            return "right";
        default:
            return null;
    }
}

function queueDirection(direction) {
    state = changeDirection(state, direction);
    render();
}

function startGame() {
    if (state.isGameOver) {
        return;
    }

    state = setRunning(state, true);
    startLoop();
    render();
}

function togglePause() {
    if (!state.hasStarted || state.isGameOver) {
        return;
    }

    state = setRunning(state, !state.isRunning);
    if (state.isRunning) {
        startLoop();
    } else {
        stopLoop();
    }
    render();
}

function resetGame() {
    state = restartGame();
    startLoop();
    render();
}

function startLoop() {
    stopLoop();
    tickHandle = window.setInterval(() => {
        const nextState = stepGame(state);
        state = nextState;
        if (state.isGameOver) {
            stopLoop();
        }
        render();
    }, TICK_MS);
}

function stopLoop() {
    if (tickHandle !== null) {
        window.clearInterval(tickHandle);
        tickHandle = null;
    }
}
