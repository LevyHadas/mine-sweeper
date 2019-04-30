
'use strict';
const MINE = '*'
const FLAG = '^'

const FLAG_GAME_OVER = 'css/imgs/flagEnd.png'

const NORMAL = 'normal'
const SAD = 'sad'
const HAPPY = 'happy'

var gLevel = { SIZE: 6, MINES: 5 }
var gBoard
var gGame
var gTimerInterval
var gSafeMode



function init(elLevelInput = null) {

    //make sure all itervals are clear
    if (gTimerInterval) clearInterval(gTimerInterval)
    gTimerInterval = null
    gSafeMode = false

    //figure out which level was chosen
    var levels =
        [{ SIZE: 4, MINES: 2 },
        { SIZE: 6, MINES: 6 },
        { SIZE: 8, MINES: 15 }]
    if (!elLevelInput) gLevel = levels[1]
    else gLevel = levels[+elLevelInput.value - 1]

    //define initial local storage var if non exist yet
    //different local storag var for each level
    var localStorageKey = 'best-score-' + gLevel.name
    if (!localStorage.getItem(localStorageKey)) localStorage.setItem(localStorageKey, 0)

    //create an empty board
    gBoard = createEmptyBoard()
    gGame = {
        isOn: false,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0,
    }

    //show everything on th DOM
    renderBoard()
    renderLevels()
    renderTimer()
    renderSmiley(NORMAL)
    renderHints()
}


function createEmptyBoard() {
    //create a board of objects
    var board = []
    for (let i = 0; i < gLevel.SIZE; i++) {
        var row = []
        for (let j = 0; j < gLevel.SIZE; j++) {
            row.push(createCell())
        }
        board.push(row)
    }
    return board
}

function createCell() {
    var cell = {
        value: 0,
        isShown: false,
        isMarked: false
    }
    return cell
}


function renderBoard() {
    //After model is ready
    //create html table and show it in DOM
    var strHTML = ''
    for (let i = 0; i < gBoard.length; i++) {
        strHTML += '<tr>'
        for (let j = 0; j < gBoard[0].length; j++) {
            strHTML += `<td class="cell cover" data-i="${i}" data-j="${j}"
            onmousedown="userMove(event)"><p></p></td>`
        }
        strHTML += '</tr>'
    }
    var elTableBody = document.querySelector('.tiles')
    elTableBody.innerHTML = strHTML
}

function renderLevels() {
    //chosing a different level also triggers this function
    //TODO: Create the strHTML in a loop
    var levelNames = ['Beginner', 'Medium', 'Expert']
    var strHTML = ''
    for (let i = 0; i < 3; i++) {
        strHTML += `<button class="btn level" value="${i + 1}" onclick="init(this)">
                    ${levelNames[i]}</button>`
    }
    var elLevelsContainer = document.querySelector('.levels-container')
    elLevelsContainer.innerHTML = strHTML
}

function renderHints() {
    var strHTML = ''
    for (let i = 0; i < 3; i++) {
        strHTML += `<button class="btn hint" onclick="hintMode(this)" disabled>?</button>`
    }
    var elHintsContainer = document.querySelector('.hints-container')
    elHintsContainer.innerHTML = strHTML
}


function renderSmiley(type) {
    var elSmiley = document.querySelector('.smiley-btn')
    var strHTML = `<img src="css/imgs/${type}.png">`
    elSmiley.innerHTML = strHTML
}


function renderTimer(secs = 0, mins = 0) {
    var strText = ''
    if (mins < 10) strText += '0' + mins
    else strText += mins
    strText += ":"
    if (secs < 10) strText += '0' + secs
    else strText += secs
    var elTimer = document.querySelector('.timer p')
    elTimer.innerText = strText
}


function userMove(ev) {
    //Handles both click events
    var elCell = ev.toElement
    var pos = { i: +elCell.dataset.i, j: +elCell.dataset.j }

    if (!gGame.isOn) {
        if (ev.which !== 1) return //first click has to be left click
        startGame(pos)
    }

    var cell = gBoard[pos.i][pos.j]

    //1=left click, 2=right, 3=middle
    if (ev.which === 1) cellClicked(cell, pos.i, pos.j)
    else cellMarked(cell, pos.i, pos.j)
    checkGameOver()
    printBoard()
}


function startGame(firstPos) {
    gGame.isOn = true
    createBoard(firstPos)
    var elHints = document.querySelectorAll('.hint')
    for (let i = 0; i < elHints.length; i++) {
        elHints[i].disabled = false
    }
    startTimer()
}


function createBoard(firstPos) {
    //MODEL. Built on first click
    var mines = addMines(firstPos) // can only be done after first move
    for (let i = 0; i < mines.length; i++) {
        var mine = mines[i]
        countMineNgbs(mine.i, mine.j)
    }
    printBoard()
}

function addMines(firstPos) {
    //add mines to random location which are not the first position
    var mines = []
    while (mines.length < gLevel.MINES) {
        var randCell = {
            i: getRandomIntInclusive(0, gBoard.length - 1),
            j: getRandomIntInclusive(0, gBoard.length - 1)
        }
        if (randCell.i === +firstPos.i && randCell.j === +firstPos.j) continue
        else {
            var cell = gBoard[randCell.i][randCell.j]
            if (cell.value === MINE) continue
            else {
                mines.push({ i: randCell.i, j: randCell.j }) //I want to use it later for nbg
                cell.value = MINE
            }
        }
    }
    printBoard()
    return mines
}

function countMineNgbs(idxI, idxJ) {
    //for each mine, add 1 to value for each of it's ngbs
    var minesCount = 0
    for (let i = idxI - 1; i <= idxI + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue
        for (let j = idxJ - 1; j <= idxJ + 1; j++) {
            if (j < 0 || j >= gBoard.length || (i == idxI && j === idxJ)) continue
            if (gBoard[i][j].value !== MINE) gBoard[i][j].value++
        }
    }
    return minesCount
}


function startTimer() {
    var secs = 0
    var mins = 0
    gTimerInterval = setInterval(function () {
        if (secs + 1 === 60) {
            mins++
            secs = 0
        }
        else secs++
        gGame.secsPassed++
        renderTimer(secs, mins)
    }, 1000)
}


function cellClicked(cell, i, j) {
    if (cell.isMarked) return
    //check what happened and update the model accordingly
    if (!gSafeMode) updateMove(i, j)
    else expandShown(i, j)
    //update DOM to show open
    renderOpenCell(i, j)
}

function cellMarked(cell, i, j) {
    if (cell.isShown) return
    //if this cell is not marked, mark it
    if (!cell.isMarked) {
        renderMarkCell(i, j) //first need to render and only than change it to marked
        //if this cell is a mine, add to count
        if (cell.value === MINE) gGame.markedCount++
        cell.isMarked = true
    } else {
        //if it's already marked, unmark it and remove from mark count
        renderMarkCell(i, j)
        if (cell.value === MINE) gGame.markedCount-- //only remove from count if we counted it
        cell.isMarked = false
    }
    //update DOM to show marked
}

function updateMove(i, j) {
    //see what was clicked, open it and check if it's a mine
    var cell = gBoard[i][j]
    if (cell.value === MINE) {
        cell.isShown = true
        var losePos = { i: i, j: j }
        gameOver(losePos)
        return
    } else if (!cell.isShown) {
        cell.isShown = true
        gGame.shownCount++
        if (cell.value === 0) expandShown(i, j)
    }
}

function expandShown(idxI, idxJ) {
    //finds all nbg for cells with value 0. Open all the ngb
    //for each nbg, run check move, as if the user clicked it.
    var hintIdxs = [{ i: +idxI, j: +idxJ }]
    for (let i = idxI - 1; i <= idxI + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue
        for (let j = idxJ - 1; j <= idxJ + 1; j++) {
            if (j < 0 || j >= gBoard.length || (i == idxI && j === idxJ)) continue
            //else - found nbg
            var nbg = gBoard[i][j]
            if (nbg.isShown) continue
            //if it's safe mode, finish and set all the cells.shown back to false
            if (gSafeMode) hintIdxs.push({ i: i, j: j })
            else if (nbg.value !== MINE) {
                if (nbg.value === 0) updateMove(i, j)
                nbg.isShown = true
                renderOpenCell(i, j, nbg.value)
                if (nbg.value !== 0) gGame.shownCount++
            }//we are showing the clicked cell in cellClicked and not in check move
            //since this is goes back to checkMove we need to render here as well 
        }
    }
    if (gSafeMode) giveHint(hintIdxs)
}


//reveal content. only DOM
function renderOpenCell(i, j) {
    var cell = gBoard[i][j]
    var elCell = document.querySelector(`td[data-i="${i}"][data-j="${j}"]`)
    //see if needs to be shown and show
    if (cell.value === MINE) {
        elCell.classList.remove('cover')
        elCell.classList.add('mine')
    } else {
        elCell.classList.remove('cover')
        elCell.innerHTML = `<p>${cell.value}</p>`
    }
    //}    
}


//see if needs to be marked or unmarked and do it
function renderMarkCell(i, j) {
    var elCell = document.querySelector(`td[data-i="${i}"][data-j="${j}"]`)
    if (gBoard[i][j].isMarked) {
        elCell.classList.remove('marked')
        elCell.classList.add('cover')
    } else {
        elCell.classList.remove('cover')
        elCell.classList.add('marked')
    }
}


function checkGameOver() {
    if (gGame.markedCount === gLevel.MINES &&
        gGame.shownCount === gLevel.SIZE ** 2 - gLevel.MINES) {
        gameOver()
    }
}

function gameOver(losePos = null) {
    clearInterval(gTimerInterval)
    gTimerInterval = null

    var localStorageKey = 'best-score-' + gLevel.name
    var bestScore = +localStorage.getItem(localStorageKey)
    if (gGame.secsPassed > bestScore) localStorage.setItem(localStorageKey, gGame.secsPassed)
    if (!losePos) {
        renderSmiley(HAPPY)
    }
    else renderLose(losePos)
    //TODO: KEEP SCORE IN LOCAL STORAGE
}

function renderLose(losePos) {
    var elCells = document.querySelectorAll('td.cell')
    for (let i = 0; i < elCells.length; i++) {

        var elCell = elCells[i]
        var idxI = +elCell.dataset.i
        var idxJ = +elCell.dataset.j
        var cell = gBoard[idxI][idxJ]
        if (cell.isMarked) {
            if (cell.value !== MINE) {
                elCell.classList.remove('cover');
                elCell.classList.add('wrong-mark');
            } else elCell.style.backgroundImage = `url(${FLAG_GAME_OVER})`
        } else {
            cell.isShown = true
            renderOpenCell(idxI, idxJ)
            if (losePos && idxI === losePos.i && idxJ === losePos.j) {
                elCell.classList.add('red-mine')
            }
        }
        renderSmiley(SAD)
    }
}


function hintMode(elHint) {
    //when user click a hint, we wait in hint mode until he 
    //clickes a cell and the cells are open and closed
    gSafeMode = true
    elHint.classList.add('active')
    elHint.disabled = true //stike out a hint
}

function giveHint(hintIdxs) {
    for (let i = 0; i < hintIdxs.length; i++) {
        //update modal
        var pos = hintIdxs[i]
        var cell = gBoard[pos.i][pos.j]
        cell.isShown = true
        //update DOM
        renderOpenCell(pos.i, pos.j)
        //TODO - DISABLE THE BOARD WHILE HIMT IS GIVEN
    }
    setTimeout(hideHint, 2000, hintIdxs)
}

function hideHint(hintIdxs) {
    for (let i = 0; i < hintIdxs.length; i++) {
        var pos = hintIdxs[i]
        var cell = gBoard[pos.i][pos.j]
        cell.isShown = false
        //update DOM
        var elCell = document.querySelector(`td[data-i="${pos.i}"][data-j="${pos.j}"]`)
        elCell.classList.add('cover')
    }
    var elHint = document.querySelector('.hint.active')
    elHint.classList.add('disabled')
    elHint.classList.remove('active')
    gSafeMode = false
}







function getRandomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function printBoard() {
    //for testing
    var board = []
    for (let i = 0; i < gLevel.SIZE; i++) {
        var row = []
        for (let j = 0; j < gLevel.SIZE; j++) {
            if (gBoard[i][j].isShown) row.push('S' + gBoard[i][j].value)
            else row.push(gBoard[i][j].value)
        }
        board.push(row)
    }
    console.table(board)
}


















