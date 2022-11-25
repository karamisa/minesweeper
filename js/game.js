'use strict'
const MINE = '💣'
const MARK = '🚩'
const LIFE = '♥️'
const NORMAL_FACE = '😃'
const WIN_FACE = '😎'
const LOSE_FACE = '🤯'
const HINTS = '💡'
const MEGAHINT = '🪄'

var gBoard = []

var gLevel = {
    SIZE: 8,
    MINES: 14
}
var gDifficulty = 2
var gStartTime
var gGameInterval
var gMegaHintFirstClick


var gGame = {
    isOn: false,
    shownCount: 0, markedCount: 0, secsPassed: 0, lives: 3, minesHit: 0, hints: 3, hintIsOn: false, safeClicks: 3, megaHintPhase: 0,
}

//SETS UP BOARD FOR NEW GAME
function onInit() {

    gGame.isOn = true; gGame.markedCount = 0; gGame.shownCount = 0; gGame.secsPassed = 0;
    (gDifficulty === 1) ? gGame.lives = 1 : gGame.lives = 3;
    gGame.minesHit = 0; gGame.safeClicks = 3; gGame.hintIsOn = false; gGame.megaHintPhase = 0;
    updateMarksLeft()
    document.querySelector('.game-timer').innerText = gGame.secsPassed
    document.querySelector('.game-lives').innerText = LIFE.repeat(gGame.lives)
    document.querySelector('.safe-clicks-remaining').innerText = gGame.safeClicks
    document.querySelector('.hints').innerHTML = `<btn onclick="onClickHint(this)">${HINTS}</btn>`.repeat(gGame.lives)
    document.querySelector('.mega-hint').innerHTML = `<btn onclick="onClickMegaHint(this)">${MEGAHINT}</btn>`
    renderGameButton(NORMAL_FACE)
    if (gGameInterval) clearInterval(gGameInterval)
    gBoard = buildBoard(gLevel.SIZE, gLevel.MINES)
    renderBoard(gBoard, '.game-board')
    displayHighScore()
}



//BUILDS BOARD WITH GIVEN SIZE
function buildBoard(size) {
    const board = []
    for (var i = 0; i < size; i++) {
        board.push([])
        for (var j = 0; j < size; j++) {
            board[i][j] = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false
            }
        }
    }
    return board
}



/*FUNCTION SETS MINES AND NEIGHBORING MINES 
    - RANDOMLY SETS MINES ANYWHERE EXCLUDING THE FIRST CLICKED CELL LOCATION
    - COUNTS AND SETS THE NEIBORING MINES COUNT FOR EACH CELL
*/
function setMinesNegsCount(board, excludedCoords) {

    //RANDOMLY PLACING MINES EXCLUDING FIRST CELL CLICKED LOCATION
    const possibleMineLocations = []
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (excludedCoords[0] !== i || excludedCoords[1] !== j) possibleMineLocations.push([i, j])
        }
    }
    for (var i = 0; i < gLevel.MINES; i++) {
        const randLocation = possibleMineLocations.splice(getRandomInt(0, possibleMineLocations.length), 1)[0]
        board[randLocation[0]][randLocation[1]].isMine = true
    }


    //COUNTING AND SETTING NEIGHBORING MINE COUNT
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board.length; j++) {
            const cell = board[i][j]
            var minesNegsCount = 0
            for (var w = -1; w <= 1; w++) {
                for (var z = -1; z <= 1; z++) {
                    const neighborCellCoords = [i + w, j + z]
                    if (neighborCellCoords[0] >= 0 && neighborCellCoords[0] < board[0].length &&
                        neighborCellCoords[1] >= 0 && neighborCellCoords[1] < board.length) {
                        const neighborCell = board[i + w][j + z]
                        if (neighborCell.isMine) minesNegsCount++
                    }
                }
            }
            cell.minesAroundCount = minesNegsCount
        }
    }

}



/*FUNCTION CALLED WHEN CELLS ARE CLICKED (LEFT) 
    - IF FIRST CELL CLICKED BOARD IS MINES ARE SET AND NEIGHBORS ARE COUNTED AND SET
    - IF CELL IS (!isMarked) & (!isShown) IT IS SENT TO SHOW CELL FUNCTION.
*/
function cellClicked(elCell, i, j) {
    if (gGame.isOn) {
        if (gGame.hintIsOn) {
            peekCellAndNeighborhood(i, j)
            gGame.hintIsOn = false
        } else if (gGame.megaHintPhase > 0) {
            megaHintClick(elCell, i, j)
        }
        else {
            const cell = gBoard[i][j]
            if (gGame.shownCount === 0) {
                setMinesNegsCount(gBoard, [i, j])
                startTime()
            }
            if (!cell.isMarked && !cell.isShown) showCell(elCell, i, j)
            checkGameOver()
        }
    }
}



/*FUNCTION CALLED WHEN CELLLS ARE LEFT CLICKED. 
    - DISABLES DEFAULT CONTEXT MENU
    - IF CELL IS NOT SHOWN IT WILL TOGGLE A MARK.
*/
function cellMarked(elCell, i, j, event) {
    event.preventDefault()
    const cell = gBoard[i][j]
    if (!cell.isShown) {
        if (!cell.isMarked) {
            cell.isMarked = true
            elCell.innerHTML = MARK
            gGame.markedCount++
        } else {
            cell.isMarked = false
            elCell.innerHTML = ''
            gGame.markedCount--
        }
    }
    updateMarksLeft()
    checkGameOver()
}



//REVEALS ANY UNSHOWN NEIGHBORS OF A CELL WITH ZERO NEIGHBORING MINES 
function expandShown(board, i, j) {
    const cell = board[i][j]
    for (var w = -1; w <= 1; w++) {
        for (var z = -1; z <= 1; z++) {
            const neighborCellCoords = [i + w, j + z]
            if (neighborCellCoords[0] >= 0 && neighborCellCoords[0] < board[0].length &&
                neighborCellCoords[1] >= 0 && neighborCellCoords[1] < board.length) {
                const neighborCell = board[i + w][j + z]
                if (!neighborCell.isShown) {
                    const elNeighborCell = document.querySelector(`.cell-${neighborCellCoords[0]}-${neighborCellCoords[1]}`)
                    showCell(elNeighborCell, neighborCellCoords[0], neighborCellCoords[1])
                }
            }
        }
    }
}



/*FUNCTION THAT REVEALS CELL
   - IF CELL IS A MINE, A MINE IS REVEALED. 
   - IF CELL IS NOT A MINE IT REVEALS NEIGHBORING MINES COUNT. 
   - IF NEIGHBORING MINE COUNT IS ZERO IT CALLS expandShown()
*/
function showCell(elCell, i, j) {
    const cell = gBoard[i][j]
    cell.isShown = true
    gGame.shownCount++
    var cellContent = ''
    if (cell.isMine) {
        cellContent = MINE
        gGame.lives--
        if (gGame.lives > 0) showInGameModal('💔')
        gGame.minesHit++
        updateMarksLeft()
        document.querySelector('.game-lives').innerText = LIFE.repeat(gGame.lives)
        elCell.classList.add("mine-shown")
    } else if (cell.minesAroundCount === 0) {
        cellContent = ''
    } else {
        cellContent = cell.minesAroundCount
    }
    elCell.classList.add("shown")
    elCell.innerHTML = cellContent
    if (!cell.isMine && cell.minesAroundCount === 0) expandShown(gBoard, i, j)
}



//CHECKS IF THE GAME IS OVER & THE OUTCOME
function checkGameOver() {
    if (gGame.markedCount === gLevel.MINES - gGame.minesHit &&
        gGame.shownCount === ((gLevel.SIZE ** 2) - gLevel.MINES + gGame.minesHit)
        && gGame.lives > 0) {
        renderGameButton(WIN_FACE)
        clearInterval(gGameInterval)
        showmodal('WINNERRR!')
        setGameHighScore(gGame.secsPassed)
        gGame.isOn = false
    }
    if (gGame.lives === 0) {
        revealAllMines()
        clearInterval(gGameInterval)
        showmodal('You lost 😟')
        renderGameButton(LOSE_FACE)
        gGame.isOn = false
    }
}



//LOOPS THROUGH BOARD AND REVEALS ANY MINES THAT ARE NOT SHOWN
function revealAllMines() {
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            const cell = gBoard[i][j]
            if (cell.isMine && !cell.isShown) {
                const elCell = document.querySelector(`.cell-${i}-${j}`)
                elCell.innerHTML = MINE
            }
        }
    }
}



//START GAME TIMER AND UPDATES DOM
function startTime() {
    gStartTime = Date.now()
    gGameInterval = setInterval(() => {
        gGame.secsPassed = ((Date.now() - gStartTime) / 1000).toFixed(0)
        document.querySelector('.game-timer').innerText = gGame.secsPassed
    }, 10)
}



//SET GAME DIFFICULTY 
function setLevel(level) {
    gDifficulty = level
    if (gDifficulty === 1) {
        gLevel.SIZE = 4
        gLevel.MINES = 2
    }
    if (gDifficulty === 2) {
        gLevel.SIZE = 8
        gLevel.MINES = 14
    }
    if (gDifficulty === 3) {
        gLevel.SIZE = 12
        gLevel.MINES = 32
    }
    onInit()
}



//RENDERS THE MIDDLE SMILEY BUTTON
function renderGameButton(emoji) {
    document.querySelector('.game-button').innerText = emoji
}



//WHEN HINT IS CLICKED THIS FUNCTION IS CALLED
function onClickHint(elCell) {
    if (gGame.shownCount > 0) {
        elCell.remove()
        gGame.hintIsOn = true
    }
}



//THIS FUNCTION TEMPORARLY REVEALS NEIGHBORHOOD
function peekCellAndNeighborhood(i, j) {
    for (var w = -1; w <= 1; w++) {
        for (var z = -1; z <= 1; z++) {
            const neighborCellCoords = [i + w, j + z]
            if (neighborCellCoords[0] >= 0 && neighborCellCoords[0] < gBoard[0].length &&
                neighborCellCoords[1] >= 0 && neighborCellCoords[1] < gBoard.length) {
                var cellContent = ''
                const neighborCell = gBoard[i + w][j + z]
                if (!neighborCell.isShown) {
                    if (neighborCell.isMine) {
                        cellContent = MINE
                    } else if (neighborCell.minesAroundCount === 0) {
                        cellContent = ''
                    } else {
                        cellContent = neighborCell.minesAroundCount
                    }

                    const elNeighborCell = document.querySelector(`.cell-${neighborCellCoords[0]}-${neighborCellCoords[1]}`)
                    elNeighborCell.classList.add("peeked")
                    elNeighborCell.innerHTML = cellContent
                    setTimeout(() => {
                        elNeighborCell.innerHTML = ''
                        elNeighborCell.classList.remove("peeked")
                    }, 1000)
                }
            }
        }
    }
}



//TOGGLES DARK MODE SWITCH
function toggleDarkMode() {
    console.log('here bitch')
    if (document.querySelector("body.light") === null) {
        document.querySelector('body').classList.replace('dark', 'light')
    } else {
        document.querySelector('body').classList.replace('light', 'dark')
    }

}



//SHOWS MODAL FOR GAME OVER 
function showmodal(result) {
    const elModal = document.querySelector('.game-modal')
    const elModalRes = elModal.querySelector('.gameover-result')
    elModalRes.innerHTML = result
    elModal.style.display = 'block'
    setTimeout(() => {
        elModal.style.display = 'none'
    }, 2000)
}



//SHOWS MODAL FOR INGAME EVENTS 
function showInGameModal(result) {
    const elModal = document.querySelector('.ingame-modal')
    elModal.innerHTML = result
    elModal.style.display = 'block'
    setTimeout(() => {
        elModal.style.display = 'none'
    }, 1000)
}

//TAKE FINAL GAME SCORE AND CHECKS TO SET AS NEW HIGHSCORE 
function setGameHighScore(score) {
    var storagedHighScore = localStorage.getItem(`highscore-${gDifficulty}`);
    if (storagedHighScore === null) {
        localStorage.setItem(`highscore-${gDifficulty}`, score + ' Seconds')
    } else if (score < parseInt(storagedHighScore)) localStorage.setItem(`highscore-${gDifficulty}`, score + ' Seconds');
    displayHighScore()
}

//DISPLAYS HIGHSCOREES FROM LOCAL STORGAE TO DOM
function displayHighScore() {
    const elRecordEASY = document.querySelector(`.easy-record`)
    elRecordEASY.innerHTML = localStorage.getItem("highscore-1") ?? '---'

    const elRecordMedium = document.querySelector(`.medium-record`)
    elRecordMedium.innerHTML = localStorage.getItem("highscore-2") ?? '---'

    const elRecordHARD = document.querySelector(`.hard-record`)
    elRecordHARD.innerHTML = localStorage.getItem("highscore-3") ?? '---'
}

//FUNCTION CALLED WHEN SAFE CLICK BUTTON IS PRESSED.
function safeClick() {
    if (gGame.safeClicks > 0) {
        gGame.safeClicks--
        const elSafeClicksRemaining = document.querySelector('.safe-clicks-remaining')
        elSafeClicksRemaining.innerHTML = gGame.safeClicks
        const safeCellCoords = getRandSafeSpot()
        console.log(safeCellCoords)
        const elSafeCell = document.querySelector(`.cell-${safeCellCoords[0]}-${safeCellCoords[1]}`)
        elSafeCell.classList.add("safe-cell")
        setTimeout(() => {
            elSafeCell.classList.remove("safe-cell")
        }, 1000)
    }
}

//RETRUNS ARRAY [i,j] OF RANDOM UNSHOWN CELL THAT IS NOT A MINE
function getRandSafeSpot() {
    const safeCoordsArr = []
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            const cell = gBoard[i][j]
            if (!cell.isMine && !cell.isShown) {
                const safeCoords = [i, j]
                safeCoordsArr.push(safeCoords)
            }
        }
    }
    return safeCoordsArr[getRandomInt(0, safeCoordsArr.length)]
}

function onClickMegaHint(elCell) {
    elCell.remove()
    gGame.megaHintPhase = 1
}

function megaHintClick(elCell, i, j) {
    if (gGame.megaHintPhase === 1) {
        elCell.classList.add("peeked")
        gMegaHintFirstClick = [i, j]
        gGame.megaHintPhase = 2
    } else {
        for (var w = gMegaHintFirstClick[0]; w <= i; w++)
            for (var z = gMegaHintFirstClick[1]; z <= j; z++) {
                const cell = gBoard[w][z]
                var cellContent = ''
                if (!cell.isShown) {
                    if (cell.isMine) {
                        cellContent = MINE
                    } else if (cell.minesAroundCount === 0) {
                        cellContent = ''
                    } else {
                        cellContent = cell.minesAroundCount
                    }
                }
                const elCell = document.querySelector(`.cell-${w}-${z}`)
                elCell.innerHTML = cellContent
                elCell.classList.add("peeked")

                setTimeout(() => {
                    elCell.innerHTML = ''
                    elCell.classList.remove("peeked")
                }, 2000)
            }
        gGame.megaHintPhase = 0

    }

}

function updateMarksLeft() {
    const marksRemaining = gLevel.MINES - gGame.markedCount - gGame.minesHit
    const elFlagsRemaining = document.querySelector(".flags-left")
    elFlagsRemaining.innerText = `${MARK} ${marksRemaining}`
}