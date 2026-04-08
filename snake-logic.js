var GRID_SIZE = 16;
var INITIAL_DIRECTION = "right";
var TICK_MS = 140;

var DIRECTION_VECTORS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

var OPPOSITES = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
};

function createInitialSnake() {
    return [
        { x: 4, y: 8 },
        { x: 3, y: 8 },
        { x: 2, y: 8 }
    ];
}

function createInitialState(randomFn) {
    var safeRandom = randomFn || Math.random;
    var snake = createInitialSnake();
    var food = placeFood(snake, GRID_SIZE, safeRandom);

    return {
        gridSize: GRID_SIZE,
        snake,
        direction: INITIAL_DIRECTION,
        queuedDirection: INITIAL_DIRECTION,
        food,
        score: 0,
        isRunning: false,
        isGameOver: false,
        hasStarted: false
    };
}

function copyState(baseState, overrides) {
    var nextState = {};
    var key;

    for (key in baseState) {
        if (Object.prototype.hasOwnProperty.call(baseState, key)) {
            nextState[key] = baseState[key];
        }
    }

    for (key in overrides) {
        if (Object.prototype.hasOwnProperty.call(overrides, key)) {
            nextState[key] = overrides[key];
        }
    }

    return nextState;
}

function changeDirection(state, nextDirection) {
    if (!DIRECTION_VECTORS[nextDirection]) {
        return state;
    }

    var current = state.direction;
    if (state.snake.length > 1 && OPPOSITES[current] === nextDirection) {
        return state;
    }

    if (state.snake.length > 1 && OPPOSITES[state.queuedDirection] === nextDirection) {
        return state;
    }

    return copyState(state, {
        queuedDirection: nextDirection
    });
}

function setRunning(state, isRunning) {
    if (state.isGameOver) {
        return state;
    }

    return copyState(state, {
        isRunning,
        hasStarted: state.hasStarted || isRunning
    });
}

function restartGame(randomFn) {
    var safeRandom = randomFn || Math.random;
    var nextState = createInitialState(safeRandom);
    return copyState(nextState, {
        isRunning: true,
        hasStarted: true
    });
}

function stepGame(state, randomFn) {
    var safeRandom = randomFn || Math.random;
    if (!state.isRunning || state.isGameOver) {
        return state;
    }

    var direction = state.queuedDirection;
    var head = state.snake[0];
    var vector = DIRECTION_VECTORS[direction];
    var nextHead = {
        x: head.x + vector.x,
        y: head.y + vector.y
    };

    var willEat = positionsEqual(nextHead, state.food);
    var bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);

    if (isOutOfBounds(nextHead, state.gridSize) || bodyToCheck.some(function (segment) { return positionsEqual(segment, nextHead); })) {
        return {
            gridSize: state.gridSize,
            snake: state.snake,
            direction,
            queuedDirection: state.queuedDirection,
            food: state.food,
            score: state.score,
            isRunning: false,
            isGameOver: true,
            hasStarted: true
        };
    }

    var nextSnake = [nextHead].concat(state.snake);
    var nextFood = state.food;
    var nextScore = state.score;

    if (willEat) {
        nextScore += 1;
        nextFood = placeFood(nextSnake, state.gridSize, safeRandom);
    } else {
        nextSnake.pop();
    }

    return copyState(state, {
        snake: nextSnake,
        direction,
        queuedDirection: direction,
        food: nextFood,
        score: nextScore,
        hasStarted: true
    });
}

function placeFood(snake, gridSize, randomFn) {
    var safeRandom = randomFn || Math.random;
    var openCells = [];

    for (var y = 0; y < gridSize; y += 1) {
        for (var x = 0; x < gridSize; x += 1) {
            if (!snake.some(function (segment) { return segment.x === x && segment.y === y; })) {
                openCells.push({ x, y });
            }
        }
    }

    if (openCells.length === 0) {
        return null;
    }

    var index = Math.min(openCells.length - 1, Math.floor(safeRandom() * openCells.length));
    return openCells[index];
}

function positionsEqual(a, b) {
    return Boolean(a && b) && a.x === b.x && a.y === b.y;
}

function isOutOfBounds(position, gridSize) {
    return position.x < 0 || position.y < 0 || position.x >= gridSize || position.y >= gridSize;
}

window.SnakeLogic = {
    GRID_SIZE: GRID_SIZE,
    INITIAL_DIRECTION: INITIAL_DIRECTION,
    TICK_MS: TICK_MS,
    createInitialSnake: createInitialSnake,
    createInitialState: createInitialState,
    changeDirection: changeDirection,
    setRunning: setRunning,
    restartGame: restartGame,
    stepGame: stepGame,
    placeFood: placeFood,
    positionsEqual: positionsEqual
};
