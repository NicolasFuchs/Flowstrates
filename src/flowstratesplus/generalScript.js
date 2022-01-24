/* Global general variables */

let sideElts;
let timeValues;
let isODAltSync = false;

let isNameDisplayed = true;
let isLineDisplayed = false;

let isGroupByOrigin = false;
let isGroupByDestination = false;
let isGroupByGeo = false;

let sortODOptionValue = 'none';
let sortAltOptionValue = 'none';
let typeODOptionValue = 'original';
let typeAltOptionValue = 'original';

let odDataObject;
let altDataObject;

let odAreaLinesSetIdentifier = 'originCode';

const tooltip = d3.select('#tooltip').style('font-size', dataFontSize + 'px');

/**********************************************************************************************************************/
/* Resize handler function */

const debouncedResize = _.debounce( () => {
    leftG.node().innerHTML = '';
    rightG.node().innerHTML = '';

    d3.selectAll('#leftLoading, #rightLoading').classed('fadeIn', true).classed('fadeOut', false);

    const isLastLineDisplayed = isLineDisplayed;
    isLineDisplayed = false;
    changeODLinesDisplay();

    d3.select('#dataFit').node().click();

    applyODStyles(maxTimeLength, maxGeoLength);
    odGeoDOMZoomedLines = [];
    odTimeDOMZoomedLines = [];
    addODMap();

    d3.select('#dataFit').node().click();

    applyAltStyles(maxTimeLength, maxGeoLength);
    altGeoDOMZoomedLines = [];
    altTimeDOMZoomedLines = [];
    addAltMap();

    d3.select('#dataFit').node().click();

    applyComparedStyles(maxGeoLength);
    addComparedMap();
    if (clickedODDataLine) drawODComparedData();
    if (clickedAltDataLine) drawAltComparedData();

    const isLastNameDisplayed = isNameDisplayed;
    isNameDisplayed = false;

    sideElts['left'].svg.call(sideElts['left'].zoom.transform, d3.zoomIdentity);
    leftDeck.setProps({viewState: { target: [document.body.clientWidth / 4, document.body.clientHeight / 2, 0] }});
    initSideMap('left', areaLPathsOutput, areaLNodesOutput, areaLShapesOutput);

    sideElts['right'].svg.call(sideElts['right'].zoom.transform, d3.zoomIdentity);
    rightDeck.setProps({viewState: { target: [document.body.clientWidth * 3/4, document.body.clientHeight / 2, 0] }});
    initSideMap('right', areaRPathsOutput, areaRNodesOutput, areaRShapesOutput);

    d3.selectAll('#leftLoading, #rightLoading').classed('fadeOut', true).classed('fadeIn', false);
    setTimeout(() => {
        createMap('left', areaLPathsOutput, areaLNodesOutput, sideElts['left'].areaShapesDefault);
        createMap('right', areaRPathsOutput, areaRNodesOutput, sideElts['right'].areaShapesDefault);

        isNameDisplayed = isLastNameDisplayed;
        if (isNameDisplayed) {
            checkLabelZoomDisplay('left');
            checkLabelZoomDisplay('right');
        }

        isLineDisplayed = isLastLineDisplayed;
        if (isLineDisplayed) changeODLinesDisplay();

        for (const side in sideElts) {
            const selectedAreas = [...sideElts[side].selectedAreas].reverse();
            if (selectedAreas[0] !== 'All') {
                sideElts[side].selectedAreas = [];
                for (const areaCode of selectedAreas) {
                    const area = getArea(d3.select(`#${side}AreaPath_${areaCode}`));
                    applyAreaSelection(side, area, true, false);
                }
            }
        }

        if (!draggable) toggleInteraction(false);

    }, 1000);
}, 1000);

window.addEventListener('resize', debouncedResize);

/**********************************************************************************************************************/
/* Utility functions */

/* Adds handlers for clear and fit buttons on the center */
function addDataCenterButtonHandlers() {
    d3.select('#dataFit').on('click', () => {
        odTimeLineContainer.call(odTimeZoom.transform, d3.zoomIdentity);
        odGeoLine.call(odGeoZoom.transform, d3.zoomIdentity);
        altGeoLine.call(altGeoZoom.transform, d3.zoomIdentity);
    });
    d3.select('#dataClear').on('click', () => {
        altComparedGraphics.clear();
        odComparedGraphics.clear();
        altClickedGraphics.clear();
        odClickedGraphics.clear();
        clickedAltDataLine = undefined;
        clickedODDataLine = undefined;
        altHighlightedComparedGraphics.interactive = false;
        altHighlightedComparedGraphics.buttonMode = false;
        odHighlightedComparedGraphics.interactive = false;
        odHighlightedComparedGraphics.buttonMode = false;
        d3.select('#comparedAltCanvas').style('opacity', 0);
        d3.select('#comparedODCanvas').style('opacity', 0);
    });
}

/* Displays legend stats (colors + numbers) */
function displayLegendStats(data, isODData, index) {
    const colorScale = data.colorScale;
    if (!colorScale) {
        if (isODData) hideODLegendContent();
        else hideAltLegendContent(index);
        return;
    }
    const stats = getStatsFromData(data);
    const minValue = stats[stats.length-1];
    const maxValue = stats[0];

    if (Array.isArray(colorScale)) {
        const negColorScale = colorScale[0];
        const posColorScale = colorScale[1];
        for (let i = 0; i < Math.floor(stats.length/2); i++) {
            d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Color${i}`).style('background-color', (maxValue <= 0) ? null : posColorScale(stats[i]));
            d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Text${i}`).html((maxValue <= 0) ? '' : stats[i]);
        }
        d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Color2`).style('background-color', 'white');
        d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Text2`).html('0');
        for (let i = Math.ceil(stats.length/2); i < stats.length; i++) {
            d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Color${i}`).style('background-color', (minValue >= 0) ? null : negColorScale(stats[i]));
            d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Text${i}`).html((minValue >= 0) ? '' : stats[i]);
        }
    } else {
        for (let i = 0; i < stats.length; i++) {
            d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Color${i}`).style('background-color', (maxValue === minValue && i !== 2) ? null : colorScale(stats[i]));
            d3.select(`#${isODData ? 'od' : 'alt'}Stat${!isODData && _.isNumber(index) ? index : ''}Text${i}`).html((maxValue === minValue && i !== 2) ? '' : stats[i]);
        }
    }
}

/* Updates OD and Alt Data */
function updateData() {
    updateODData();
    updateAltData();
}

/* Updates global data (colorscale, min and max) for original and difference */
function updateGlobalData(newODDataObject, isODData, originalColorInterpolator) {
    let globalOriginalMinValue = Infinity;
    let globalDifferenceMinValue = Infinity;
    let globalOriginalMaxValue = -Infinity;
    let globalDifferenceMaxValue = -Infinity;
    for (const id in newODDataObject.data) {
        const globalOriginalExtent = d3.extent(Object.values(newODDataObject.data[id].original?.data?.total || {}));
        const globalDifferenceExtent = d3.extent(Object.values(newODDataObject.data[id].difference?.data?.total || {}));
        globalOriginalMinValue = Math.min(globalOriginalMinValue, globalOriginalExtent[0] || Infinity);
        globalOriginalMaxValue = Math.max(globalOriginalMaxValue, globalOriginalExtent[1] || -Infinity);
        globalDifferenceMinValue = Math.min(globalDifferenceMinValue, globalDifferenceExtent[0] || Infinity);
        globalDifferenceMaxValue = Math.max(globalDifferenceMaxValue, globalDifferenceExtent[1] || -Infinity);
    }
    newODDataObject.globalData.original.minValue = globalOriginalMinValue;
    newODDataObject.globalData.original.maxValue = globalOriginalMaxValue;
    newODDataObject.globalData.original.colorScale = d3.scaleSequential().domain([globalOriginalMinValue, globalOriginalMaxValue]).interpolator(originalColorInterpolator);
    newODDataObject.globalData.difference.minValue = globalDifferenceMinValue;
    newODDataObject.globalData.difference.maxValue = globalDifferenceMaxValue;
    const negColorScale = d3.scaleSequential().domain([0, Math.min(globalDifferenceMinValue, 0)]).interpolator(differenceColorInterpolators[0]);
    const posColorScale = d3.scaleSequential().domain([0, Math.max(globalDifferenceMaxValue, 0)]).interpolator(differenceColorInterpolators[1]);
    newODDataObject.globalData.difference.colorScale = [negColorScale, posColorScale];

    if (isODData && !isODLocalColorScale) odLegendCheckboxHandler();
    else if (!isODData && !isAltLocalColorScale) altLegendCheckboxHandler();
}

/* Resets button styles when an exclusive button is clicked */
function resetButtonStyles(containerID, button) {
    const isClicked = button.classed('clicked');
    d3.selectAll(`#${containerID} .optionButton`).classed('clicked', false);
    button.classed('clicked', !isClicked);
    return !isClicked;
}

/* Creates a d3 scaleBand */
function createScaleBand(domain, rangeMax) {
    return d3.scaleBand().domain(domain).range([0, rangeMax]);
}

/* Returns a reduced list of metric texts to display according to space available (zoom level) */
function getReducedDomain(scaleBand, spaceScale) {
    const spaceCheck = dataFontSize * spaceScale / scaleBand.bandwidth();
    let reducedDomain = scaleBand.domain();
    if (spaceCheck > 1) {
        for (let i = 0; i < Math.ceil(Math.log(spaceCheck)/Math.log(2)); i++) {
            reducedDomain = reducedDomain.filter((d, i) => i % 2 === 0);
        }
    }
    return reducedDomain;
}

/* Formats date using format YYYY.MM.DD */
function formatDate(hasYear, hasMonth, hasDay, data) {
    let date = '';
    if (hasYear) date += data['Year'];
    if (hasMonth) date += ((hasYear) ? '.' : '') + data['Month'];
    if (hasDay) date += ((hasMonth) ? '.' : '') + data['Day'];
    return date;
}

/* Gets the name of a file from its url */
function getFileName(url) {
    return url.replace(/(.*\/)(.*)\.(.*)/, '$2');
}

/* Gets a rounded number from data */
function tooltipRoundData(data) {
    return Math.round((data + Number.EPSILON) * 1000) / 1000;
}

/* Computes stats for legend categories */
function getStatsFromData(data) {
    let minValue = data.minValue;
    let maxValue = data.maxValue;
    let midValue = (Array.isArray(data.colorScale)) ? 0 : (minValue + maxValue) / 2;
    const value2 = tooltipRoundData((maxValue + midValue) / 2);
    const value4 = tooltipRoundData((minValue + midValue) / 2);
    minValue = tooltipRoundData(minValue);
    maxValue = tooltipRoundData(maxValue);
    midValue = tooltipRoundData(midValue);
    return [maxValue, value2, midValue, value4, minValue];
}

/* Removes the last potential digits (area variation) of areaCode */
function removeLastDigits(areaCode) {
    while(areaCode[areaCode.length-1] >= '0' && areaCode[areaCode.length-1] <= '9') {
        areaCode = areaCode.slice(0, -1);
    }
    return areaCode;
}

/* Returns difference or original colorScale according to data */
function getDiffOriColorScale(colorScale, data) {
    if (Array.isArray(colorScale)) {
        if (data === 0) return () => 'rgb(255,255,255)';
        else if (data < 0) return colorScale[0];
        else return colorScale[1];
    } else {
        return colorScale;
    }
}