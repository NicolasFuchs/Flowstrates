const questionsLogo = d3.select('#questionsLogo');
const questionsPane = d3.select('#questionsPane');
const closeButtons = d3.selectAll('.questionsCloseButton');
const questionButtons = d3.selectAll('.questionsButton');
const questionsEndButton = d3.select('#questionsEndButton');
const questionsOverlay = d3.select('#questionsOverlay');

const addFindingButton = d3.select('#addFindingButton');
const textAreaContainer = d3.select('#textAreaContainer');
const findingsTextArea = d3.select('#findingsTextArea');
const findingValidate = d3.select('#findingValidate');
const findingDelete = d3.select('#findingDelete');
const findingTable = d3.select('#findingTable');

let lastX;
let lastY;
let draggable = false;
const drag = d3.drag()
    .on('start', () => {
        lastX = questionsPane.node().getBoundingClientRect().left;
        lastY = questionsPane.node().getBoundingClientRect().top;
        questionsPane.style('cursor', 'grabbing');
    })
    .on('drag', (event) => {
        if (draggable) {
            lastX = lastX + event.dx;
            lastY = lastY + event.dy;
            questionsPane.style('left', lastX + 'px');
            questionsPane.style('top', lastY + 'px');
        }
    })
    .on('end', () => {
        questionsPane.style('cursor', 'auto');
    })
    .filter((event) => {
        return event.srcElement !== d3.select('#findingsTextArea').node();
    });

function addDragInteractivity() {
    draggable = true;
    questionsPane.call(drag);
}

function removeDragInteractivity() {
    draggable = false;
    questionsPane.on('mousedown.drag', null);
}

function addBackgroundInteractivity() {
    questionsPane
        .on('mouseenter', () => {
            toggleInteraction(false);
            hideHighlight();
        })
        .on('mouseleave', () => {
            toggleInteraction(true);
        });
}

function removeBackgroundInteractivity() {
    questionsPane
        .on('mouseenter', null)
        .on('mouseleave', null);
}

let time = 0;

questionsLogo.on('click', () => {
    if (!lastX) lastX = document.body.clientWidth * 3 / 8;
    if (!lastY) lastY = document.body.clientHeight / 10;
    if (!time) {
        removeBackgroundInteractivity();
        removeDragInteractivity();
        toggleInteraction(false);
        questionsOverlay.style('display', 'block');
    }
    time++;
    questionsPane.style('display', 'grid')
        .style('top', lastY + 'px')
        .style('left', lastX + 'px');
});
closeButtons.on('click', () => {
    questionsPane.style('display', 'none');
    questionsOverlay.style('display', 'none');
});
questionButtons.on('click', function() {
    displayNextPage(this);
});
questionsEndButton.on('click', function() {
    questionsPane.style('display', 'none');
    questionsOverlay.style('display', 'none');
    questionsLogo.style('display', 'none');
    toggleInteraction(true);
})
d3.select('#videoButton').on('click', function() {
    displayNextPage(this);

    const videoHeight = d3.select('#video').node().videoHeight;
    const videoWidth = d3.select('#video').node().videoWidth;
    const ratioHeight = document.body.clientHeight / videoHeight;
    const ratioWidth = document.body.clientWidth / videoWidth;
    const ratioHeightWidth = videoHeight / videoWidth;
    const height = (ratioHeight < ratioWidth) ? 80/100 * document.body.clientHeight : 80/100 * document.body.clientWidth * ratioHeightWidth;
    const width = (ratioHeight < ratioWidth) ? 80/100 * document.body.clientHeight / ratioHeightWidth : 80/100 * document.body.clientWidth;
    const top = (document.body.clientHeight - height) / 2;
    const left = (document.body.clientWidth - width) / 2;

    questionsPane
        .transition()
        .duration(2000)
        .style('height', height + 'px')
        .style('width', width + 'px')
        .style('top', top + 'px')
        .style('left', left + 'px')
        .style('background-color', 'black')
        .on('end', () => {
            d3.select('#video')
                .style('display', 'block')
                .transition()
                .duration(1000)
                .style('opacity', 1)
                .on('end', () => {
                    d3.select('#video').node().play();
                });
        });
});

function videoEnded() {
    d3.select('#video')
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .on('end', () => {
            d3.select('#video').style('display', 'none');
            questionsPane
                .transition()
                .duration(2000)
                .style('width', `${25/100 * document.body.clientWidth}px`)
                .style('left', `${37.5/100 * document.body.clientWidth}px`)
                .style('background-color', 'dimgrey')
                .on('end', () => {
                    displayNextPage(d3.select('#video').node());
                });
        });
}

let timerValue = questionsTimerDuration;
let timerInterval;
d3.select('#startPartButton').on('click', function() {
    displayNextPage(this);
    questionsLogo.style('opacity', 1);
    questionsOverlay.style('display', 'none');
    displayTimerValues(timerValue);
    addDragInteractivity();
    addBackgroundInteractivity();
    timerInterval = setInterval(() => {
        if (!timerValue) {
            clearInterval(timerInterval);
            removeBackgroundInteractivity();
            removeDragInteractivity();
            toggleInteraction(false);
            d3.select('#questionsTimer')
                .style('display', 'flex')
                .html('Time\'s up !');
            questionsOverlay.style('display', 'block');
            if (addFindingButton.style('display') === 'flex') {
                addFindingButton.style('display', 'none');
                d3.select('#endPartButton').style('display', 'block');
            }
            d3.select('.nextToTimer').style('display', 'none');
            questionsPane
                .style('display', 'grid')
                .style('top', `${10/100 * document.body.clientHeight}px`)
                .style('left', `${37.5/100 * document.body.clientWidth}px`);
            questionsLogo.style('opacity', 0);
        }
        displayTimerValues(--timerValue);
    }, 1000);
});

addFindingButton.on('click', function () {
    d3.select(this).style('display', 'none');
    textAreaContainer.style('display', 'grid');
});

findingsTextArea.on('change keyup keydown paste cut copy', () => {
    const val = findingsTextArea.property('value');
    if (val === '') {
        disableValidateFinding();
    } else {
        findingValidate
            .style('pointer-events', 'auto')
            .style('opacity', 1);
    }
});

let findingsContent = '';
let findingsCounter = 0;
findingValidate.on('click', () => {
    if (!findingsCounter) findingTable.style('justify-content', 'start').html('');
    findingsCounter++;
    findingsContent += `F${findingsCounter}\n`;
    const findingValue = findingsTextArea.property('value');
    findingsContent += `${findingValue}\n\n`;
    const finding = `<div class="findingLine"><div>${findingsCounter}</div><div>${findingValue}</div></div>`;
    findingTable.node().insertAdjacentHTML('beforeend', finding);
    findingTable.node().scrollTo(0, findingTable.node().scrollHeight);
    findingsTextArea.property('value', '');
    findingDelete.node().click();
});

findingDelete.on('click', () => {
    textAreaContainer.style('display', 'none');
    if (timerValue === -1) {
        d3.select('#endPartButton').style('display', 'block');
    } else {
        addFindingButton.style('display', 'flex');
        findingsTextArea.property('value', '');
        disableValidateFinding();
    }
});

function disableValidateFinding() {
    findingValidate
        .style('pointer-events', 'none')
        .style('opacity', 0.2);
}

d3.select('#endPartButton:not(.finalButton)').on('click', () => {
    const isVersionA = window.location.href.includes('versionA');
    window.sessionStorage.setItem('flowstrates', findingsContent || 'No finding');
    const urlEnd = 'version' + ((isVersionA) ? 'B' : 'A') + '/index' + ((isVersionA) ? 'B' : 'A') + 'End.html';
    window.location.href = window.location.href.replace(/(.*\/).*\/.*html.*/, '$1') + urlEnd;
});

d3.select('.finalButton').on('click', function() {
    const parentNode = d3.select(this.parentNode.parentNode);
    parentNode.style('display', 'none');
    questionsPane
        .transition()
        .duration(2000)
        .style('width', `${40/100 * document.body.clientWidth}px`)
        .style('height', `${90/100 * document.body.clientHeight}px`)
        .style('left', `${30/100 * document.body.clientWidth}px`)
        .style('top', `${5/100 * document.body.clientHeight}px`)
        .style('background-color', 'dimgrey')
        .on('end', () => {
            d3.select(parentNode.node().nextElementSibling).style('display', 'grid');
        });
})

d3.selectAll('input[type=radio]').on('change', () => {
    if (d3.selectAll('input[type=radio]:checked').size() === 9) {
        d3.select('.qualitativeSend')
            .style('pointer-events', 'auto')
            .node().disabled = false;
    } else {
        d3.select('.qualitativeSend')
            .style('pointer-events', 'none')
            .node().disabled = true;
    }
});

d3.select('.qualitativeSend').on('click', function() {
    const isVersionA = window.location.href.includes('versionA');
    const response = {
        findings: {},
        qualitative: [],
        versionOrder: (isVersionA) ? 'B -> A' : 'A -> B'
    };
    response.findings[(isVersionA) ? 'versionB' : 'versionA'] = window.sessionStorage.getItem('flowstrates');
    response.findings[(isVersionA) ? 'versionA' : 'versionB'] = findingsContent || 'No finding';
    for (const radioGroup of qualitativeRadioGroups) {
        const radioGObject = {};
        radioGObject[radioGroup] = d3.select(`input[type=radio][name=${radioGroup}]:checked`).property('value');
        response.qualitative.push(radioGObject);
    }
    response.comments = d3.select('#commentsTextArea').property('value') || 'No comment';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', logServerAddress);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(response));

    d3.select(d3.select('#qualitativeEval').node().parentNode).style('display', 'none');
    d3.select('#endSmileyPage').style('display', 'grid');
});

function displayTimerValues(newTimerValue) {
    const minValue = Math.floor(newTimerValue / 60);
    const secValue = newTimerValue % 60;
    d3.select('#questionsTimerMin').html(((minValue < 10) ? '0' : '') + minValue);
    d3.select('#questionsTimerSec').html(((secValue < 10) ? '0' : '') + secValue);
}

function displayNextPage(element) {
    const parentNode = d3.select(element.parentNode);
    parentNode.style('display', 'none');
    d3.select(parentNode.node().nextElementSibling).style('display', 'grid');
}

function hideHighlight() {
    altHighlightedComparedGraphics.clear();
    odHighlightedComparedGraphics.clear();
    altHighlightedGraphics.clear();
    odHighlightedGraphics.clear();
    tooltip.style('display', 'none');
}

function toggleInteraction(isInteractive) {
    d3.select('#paneContainer').style('pointer-events', isInteractive ? 'auto' : 'none');
    if (!isInteractive || isInteractive && clickedAltDataLine) altHighlightedComparedGraphics.interactive = isInteractive;
    if (!isInteractive || isInteractive && clickedODDataLine) odHighlightedComparedGraphics.interactive = isInteractive;
    altHighlightedGraphics.interactive = isInteractive;
    odHighlightedGraphics.interactive = isInteractive;
}