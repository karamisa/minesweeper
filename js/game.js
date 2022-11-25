'use strict'
const MINE = '💣'
const MARK = '🚩'
const LIFE = '♥️'
const NORMAL_FACE = '😃'
const WIN_FACE = '😎'
const LOSE_FACE = '🤯'

var gBoard = []

var gLevel = {
    SIZE: 12,
    MINES: 10,
}
var gStartTime
var gGameInterval


var gGame = {
    isOn: false,
    shownCount: 0, markedCount: 0, secsPassed: 0, lives: 3
}


function onInit() {
    gBoard = buildBoard(gLevel.SIZE, gLevel.MINES)
    renderBoard(gBoard, '.game-board')
    gGame.isOn=true
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
        const cell = gBoard[i][j]
        if (gGame.shownCount === 0) {
            setMinesNegsCount(gBoard, [i, j])
            startTime()
        }
        if (!cell.isMarked && !cell.isShown) showCell(elCell, i, j)
        checkGameOver()
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
    } else {
        cellContent = cell.minesAroundCount
    }

    elCell.innerHTML = cellContent
    if (!cell.isMine && cell.minesAroundCount === 0) expandShown(gBoard, i, j)
}



//CHECKS IF THE GAME IS OVER & THE OUTCOME
function checkGameOver() {
    if (gGame.markedCount === gLevel.MINES &&
        gGame.shownCount === (gLevel.SIZE ** 2) - gLevel.MINES) {
        console.log('winner!')
        clearInterval(gGameInterval)
        gGame.isOn=false
    }
    if (gGame.lives === 0) {
        revealAllMines()
        clearInterval(gGameInterval)
        console.log('loser!')
        gGame.isOn=false
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



function startTime() {
    gStartTime = Date.now()
    gGameInterval = setInterval(() => {
        const seconds = ((Date.now() - gStartTime) / 1000).toFixed(3)
        document.querySelector('.game-timer').innerText = seconds
    }, 10)
}
