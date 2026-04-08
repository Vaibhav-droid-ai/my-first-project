var GRID_SIZE = window.SnakeLogic.GRID_SIZE;
var TICK_MS = window.SnakeLogic.TICK_MS;
var changeDirection = window.SnakeLogic.changeDirection;
var createInitialState = window.SnakeLogic.createInitialState;
var restartGame = window.SnakeLogic.restartGame;
var setRunning = window.SnakeLogic.setRunning;
var stepGame = window.SnakeLogic.stepGame;

var board = document.getElementById("game-board");
var scoreValue = document.getElementById("score");
var statusValue = document.getElementById("status");
var overlay = document.getElementById("overlay");
var overlayTitle = document.getElementById("overlay-title");
var overlayMessage = document.getElementById("overlay-message");
var overlayAction = document.getElementById("overlay-action");
var startButton = document.getElementById("start-button");
var pauseButton = document.getElementById("pause-button");
var restartButton = document.getElementById("restart-button");
var directionButtons = document.querySelectorAll("[data-direction]");

var state = createInitialState();
var tickHandle = null;

buildBoard();
render();

document.addEventListener("keydown", handleKeydown);
startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", resetGame);
overlayAction.addEventListener("click", function () {
    if (state.isGameOver || !state.hasStarted) {
        resetGame();
        return;
    }

    startGame();
});

for (var buttonIndex = 0; buttonIndex < directionButtons.length; buttonIndex += 1) {
    directionButtons[buttonIndex].addEventListener("click", function () {
        queueDirection(this.getAttribute("data-direction"));
    });
}

function buildBoard() {
    var fragment = document.createDocumentFragment();

    for (var index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
        var cell = document.createElement("div");
        cell.className = "cell";
        fragment.appendChild(cell);
    }

    board.appendChild(fragment);
}

function render() {
    var cells = board.children;

    for (var cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
        cells[cellIndex].className = "cell";
    }

    state.snake.forEach(function (segment, index) {
        var cell = getCell(segment.x, segment.y);
        if (!cell) {
            return;
        }

        cell.classList.add("snake");
        if (index === 0) {
            cell.classList.add("head");
        }
    });

    if (state.food) {
        var foodCell = getCell(state.food.x, state.food.y);
        if (foodCell) {
            foodCell.classList.add("food");
        }
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
    var targetCell = board.children[(y * GRID_SIZE) + x];
    return targetCell || null;
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
    var direction = mapKeyToDirection(event.key);

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
    var normalized = key.toLowerCase();

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
    tickHandle = window.setInterval(function () {
        var nextState = stepGame(state);
        state = nextState;
        if (state.isGameOver) {
            stopLoop();
        }
        render();
    }, TICK_MS);
}

window.startGame = startGame;

function stopLoop() {
    if (tickHandle !== null) {
        window.clearInterval(tickHandle);
        tickHandle = null;
    }
}
