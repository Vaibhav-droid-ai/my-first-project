const GRID_SIZE = 16;
const INITIAL_DIRECTION = "right";
const TICK_MS = 140;

const DIRECTION_VECTORS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

const OPPOSITES = {
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

function createInitialState(randomFn = Math.random) {
    const snake = createInitialSnake();
    const food = placeFood(snake, GRID_SIZE, randomFn);

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

function changeDirection(state, nextDirection) {
    if (!DIRECTION_VECTORS[nextDirection]) {
        return state;
    }

    const current = state.direction;
    if (state.snake.length > 1 && OPPOSITES[current] === nextDirection) {
        return state;
    }

    if (state.snake.length > 1 && OPPOSITES[state.queuedDirection] === nextDirection) {
        return state;
    }

    return {
        ...state,
        queuedDirection: nextDirection
    };
}

function setRunning(state, isRunning) {
    if (state.isGameOver) {
        return state;
    }

    return {
        ...state,
        isRunning,
        hasStarted: state.hasStarted || isRunning
    };
}

function restartGame(randomFn = Math.random) {
    const nextState = createInitialState(randomFn);
    return {
        ...nextState,
        isRunning: true,
        hasStarted: true
    };
}

function stepGame(state, randomFn = Math.random) {
    if (!state.isRunning || state.isGameOver) {
        return state;
    }

    const direction = state.queuedDirection;
    const head = state.snake[0];
    const vector = DIRECTION_VECTORS[direction];
    const nextHead = {
        x: head.x + vector.x,
        y: head.y + vector.y
    };

    const willEat = positionsEqual(nextHead, state.food);
    const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);

    if (isOutOfBounds(nextHead, state.gridSize) || bodyToCheck.some((segment) => positionsEqual(segment, nextHead))) {
        return {
            ...state,
            direction,
            isRunning: false,
            isGameOver: true,
            hasStarted: true
        };
    }

    const nextSnake = [nextHead, ...state.snake];
    let nextFood = state.food;
    let nextScore = state.score;

    if (willEat) {
        nextScore += 1;
        nextFood = placeFood(nextSnake, state.gridSize, randomFn);
    } else {
        nextSnake.pop();
    }

    return {
        ...state,
        snake: nextSnake,
        direction,
        queuedDirection: direction,
        food: nextFood,
        score: nextScore,
        hasStarted: true
    };
}

function placeFood(snake, gridSize, randomFn = Math.random) {
    const openCells = [];

    for (let y = 0; y < gridSize; y += 1) {
        for (let x = 0; x < gridSize; x += 1) {
            if (!snake.some((segment) => segment.x === x && segment.y === y)) {
                openCells.push({ x, y });
            }
        }
    }

    if (openCells.length === 0) {
        return null;
    }

    const index = Math.min(openCells.length - 1, Math.floor(randomFn() * openCells.length));
    return openCells[index];
}

function positionsEqual(a, b) {
    return Boolean(a && b) && a.x === b.x && a.y === b.y;
}

function isOutOfBounds(position, gridSize) {
    return position.x < 0 || position.y < 0 || position.x >= gridSize || position.y >= gridSize;
}

window.SnakeLogic = {
    GRID_SIZE,
    INITIAL_DIRECTION,
    TICK_MS,
    createInitialSnake,
    createInitialState,
    changeDirection,
    setRunning,
    restartGame,
    stepGame,
    placeFood,
    positionsEqual
};
