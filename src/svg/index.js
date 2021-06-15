/* General properties */

let pointRadius = 3/2;
let pointOriColor = 'white';
let pointSelColor = 'black';

let nameOriFontSize = 10;
let nameOriFontColor = 'white';
let nameSelFontColor = 'black';
let nameOriFontWeight = 'normal';
let nameSelFontWeight = 900;
let nameFontSizeMult = 4/3;

let pathOriStrokeSize = 1/4;
let pathOriStrokeColor = 'lightskyblue';
let pathSelStrokeColor = 'black';
let pathOriFillColor = 'dimgrey';
let pathSelFillColor = '#404040';
let pathStrokeSizeMult = 5;

let rectRoundedCornerRatio = 1/10;
let rectWidthHeightRatio = 3;

let fitDuration = 3000;

let oddataFontSize = 10;

/**********************************************************************************************************************/
const leftsvg = d3.select('#leftsvg');
const leftG = leftsvg.append('g');

const rightsvg = d3.select('#rightsvg');
const rightG = rightsvg.append('g');

const sideElts = {  left: {
                        svg: leftsvg,
                        firstG: leftG,
                        scale: 1,
                        selectedAreas:['All'],
                        nameCrtFontSize: nameOriFontSize,
                        pathCrtStrokeSize: pathOriStrokeSize,
                        areaData: {},
                        areaShapesDefault: []
                    },
                    right: {
                        svg: rightsvg,
                        firstG: rightG,
                        scale: 1,
                        selectedAreas:['All'],
                        nameCrtFontSize: nameOriFontSize,
                        pathCrtStrokeSize: pathOriStrokeSize,
                        areaData: {},
                        areaShapesDefault: []
                    }};

addModeNotificationHandlers();

const pathsFileUrl = '../../data/countryPaths.json';
const nodesFileUrl = '../../data/countryNodes.csv';
const shapesFileUrl = '../../data/countryShapes.csv';

const leftZoom = addMapZoomBehavior('left'); leftsvg.call(leftZoom);
const leftDrag = addMapDragBehavior('left'); leftsvg.call(leftDrag);
sideElts.left.zoom = leftZoom;
addBottomButtonHandlers('left');
loadAreaData('left', pathsFileUrl, nodesFileUrl, shapesFileUrl, createAreaObject);

const rightZoom = addMapZoomBehavior('right'); rightsvg.call(rightZoom);
const rightDrag = addMapDragBehavior('right'); rightsvg.call(rightDrag);
sideElts.right.zoom = rightZoom;
addBottomButtonHandlers('right');
loadAreaData('right', pathsFileUrl, nodesFileUrl, shapesFileUrl, createAreaObject);

/**********************************************************************************************************************/
/* Handlers for mode notifications display */

let aggreMode = false;
let lassoMode = false;

function addModeNotificationHandlers() {
    let onLSvg = false;
    let onRSvg = false;
    document.onkeydown = (e) => {
        if (e.key === 'Control') {
            aggreMode = true;
            if (onLSvg) d3.select('#leftAggreModeNotif').style('display', 'block');
            else if (onRSvg) d3.select('#rightAggreModeNotif').style('display', 'block');
        }
        if (e.key === 'Shift') {
            lassoMode = true;
            if (onLSvg) d3.select('#leftLassoModeNotif').style('display', 'block');
            else if (onRSvg) d3.select('#rightLassoModeNotif').style('display', 'block');
        }
    };
    document.onkeyup = (e) => {
        if (e.key === 'Control') {
            aggreMode = false;
            if (onLSvg) d3.select('#leftAggreModeNotif').style('display', 'none');
            else if (onRSvg) d3.select('#rightAggreModeNotif').style('display', 'none');
        }
        if (e.key === 'Shift') {
            lassoMode = false;
            if (onLSvg) d3.select('#leftLassoModeNotif').style('display', 'none');
            if (onRSvg) d3.select('#rightLassoModeNotif').style('display', 'none');
        }
    };
    leftsvg.on('mouseenter', () => {
        onLSvg = true;
        if (aggreMode) d3.select('#leftAggreModeNotif').style('display', 'block');
        if (lassoMode) d3.select('#leftLassoModeNotif').style('display', 'block');
    });
    leftsvg.on('mouseleave', () => {
        onLSvg = false;
        if (aggreMode) d3.select('#leftAggreModeNotif').style('display', 'none');
        if (lassoMode) d3.select('#leftLassoModeNotif').style('display', 'none');
    });
    rightsvg.on('mouseenter', () => {
        onRSvg = true;
        if (aggreMode) d3.select('#rightAggreModeNotif').style('display', 'block');
        if (lassoMode) d3.select('#rightLassoModeNotif').style('display', 'block');
    });
    rightsvg.on('mouseleave', () => {
        onRSvg = false;
        if (aggreMode) d3.select('#rightAggreModeNotif').style('display', 'none');
        if (lassoMode) d3.select('#rightLassoModeNotif').style('display', 'none');
    });
}

/**********************************************************************************************************************/
/* Mouse events behaviors on maps (zoom and drag) */

function addMapZoomBehavior(side) {
    return d3.zoom()
        .on('zoom', (event) => {
            sideElts[side].firstG.attr('transform', event.transform);
            let newScale = event.transform.k;
            if (newScale !== sideElts[side].scale) {
                keepLabelSize(side, newScale);
                checkLabelZoomDisplay(side);
                sideElts[side].scale = newScale;
            }
        })
        .scaleExtent([0.8, Infinity])
        .filter((event) => { return !event.ctrlKey && !event.shiftKey && !event.button; });
}

function addMapDragBehavior(side) {
    let buffer;
    const bufferSize = 10;
    let dragPath;
    let strPath;
    let inverseMatrix;
    const svg = sideElts[side].svg;
    let selection;
    return d3.drag()
        .on('start', (event) => {
            inverseMatrix = svg.node().getCTM().inverse();
            selection = d3.selectAll(`.${side}AreaPoint`);
            dragPath = svg.append('path');
            dragPath
                .attr('id', 'dragPath')
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', '2');
            buffer = [];
            const svgP = getPoint(event, side, inverseMatrix);
            addPointToBuffer(buffer, bufferSize,{x: svgP.x, y: svgP.y});
            strPath = 'M' + svgP.x + ' ' + svgP.y;
            dragPath = dragPath.attr('d', strPath + ' z');
        })
        .on('drag', (event) => {
            const svgP = getPoint(event, side, inverseMatrix);
            addPointToBuffer(buffer, bufferSize,{x: svgP.x, y: svgP.y});
            strPath = updateDragPath(buffer, bufferSize, strPath, dragPath);
            checkPointInLasso(side, selection, true, aggreMode, inverseMatrix, svg, dragPath);
        })
        .on('end', () => {
            if (!aggreMode) clearSelection(side);
            checkPointInLasso(side, selection, false, aggreMode, inverseMatrix, svg, dragPath);
            dragPath.remove();
            checkLabelZoomDisplay(side);
        })
        .filter((event) => { return event.shiftKey});
}

function checkPointInLasso(side, selection, onlyPoint, aggreMode, inverseMatrix, svg, dragPath) {
    selection.each(function() {
        const areaPoint = d3.select(this);
        const left = areaPoint.node().getBoundingClientRect().left - svg.node().getBoundingClientRect().left;
        const top = areaPoint.node().getBoundingClientRect().top - svg.node().getBoundingClientRect().top;
        const pt = svg.node().createSVGPoint();
        pt.x = left;
        pt.y = top;
        const svgP = pt.matrixTransform(inverseMatrix);
        if (dragPath.node().isPointInFill(svgP)) {
            const areaPath = d3.select(`#${side}AreaPath_` + areaPoint.attr('id').split('_')[1]);
            if (onlyPoint) d3.select(`#${side}AreaPoint_` + areaPoint.attr('id').split('_')[1]).style('fill', pointSelColor);
            else applyAreaSelection(side, getArea(areaPath), aggreMode, true);
        } else {
            d3.select(`#${side}AreaPoint_` + areaPoint.attr('id').split('_')[1]).style('fill', pointOriColor);
        }
    });
}

function addPointToBuffer(buffer, bufferSize, pt) {
    buffer.push(pt);
    while (buffer.length > bufferSize) {
        buffer.shift();
    }
}

function getPoint(event, side, inverseMatrix) {
    const pt = sideElts[side].svg.node().createSVGPoint();
    pt.x = event.x;
    pt.y = event.y;
    return pt.matrixTransform(inverseMatrix);
}

function getAvgPoint(buffer, bufferSize, offset) {
    let len = buffer.length;
    if (len % 2 === 1 || len >= bufferSize) {
        let totalX = 0;
        let totalY = 0;
        let count = 0;
        for (let i = offset; i < len; i++) {
            count++;
            let pt = buffer[i];
            totalX += pt.x;
            totalY += pt.y;
        }
        return {x: totalX/count, y: totalY/count};
    }
    return null;
}

function updateDragPath(buffer, bufferSize, strPath, dragPath) {
    let pt = getAvgPoint(buffer, bufferSize,0);
    if (pt) {
        strPath += ' L ' + pt.x + ' ' + pt.y;
        let tmpPath = '';
        for (let offset = 2; offset < buffer.length; offset += 2) {
            pt = getAvgPoint(buffer, bufferSize, offset);
            tmpPath += ' L ' + pt.x + ' ' + pt.y;
        }
        dragPath.attr('d', strPath + tmpPath + ' z');
    }
    return strPath;
}

/**********************************************************************************************************************/
/* Handlers for bottom buttons (Clear and Fit) */

function addBottomButtonHandlers(side) {
    d3.select(`#${side}Clear`).on('click', () => {
        clearSelection(side);
        updateSelectedAreas(side);
    });
    d3.select(`#${side}Fit`).on('click', () => {
        sideElts[side].svg.transition().duration(fitDuration).call(
            sideElts[side].zoom.transform,
            d3.zoomIdentity
        );
    });
}

/**********************************************************************************************************************/
/* Handler when the mouse enters an area (hovering) */
function handleAreaEnter() {
    if (!lassoMode) {
        const area = getArea(d3.select(this));
        const [areaPath, areaPoint, areaName] = area;
        areaPath.classed('hovered', true);
        areaName.classed('hovered', true);
        const side = area[0].attr('id').startsWith('l') ? 'left' : 'right';
        areaRaise(area);
        applyStyle(areaName, {'fill': nameSelFontColor, 'font-weight': nameSelFontWeight, 'font-size': sideElts[side].nameCrtFontSize * nameFontSizeMult + 'px'});
        applyStyle(areaPoint, {'fill': pointSelColor});
        applyStyle(areaPath, {'stroke': pathSelStrokeColor, 'stroke-width': sideElts[side].pathCrtStrokeSize * pathStrokeSizeMult});
    }
}

/* Handler when the mouse leaves an area (hovering) */
function handleAreaLeave() {
    const area = getArea(d3.select(this));
    const [areaPath, areaPoint, areaName] = area;
    areaPath.classed('hovered', false);
    areaName.classed('hovered', false);
    const side = area[0].attr('id').startsWith('l') ? 'left' : 'right';
    if (!areaPath.classed('selected')) {
        areaLower(area);
        applyStyle(areaName, {'fill': nameOriFontColor, 'font-weight': nameOriFontWeight, 'font-size': sideElts[side].nameCrtFontSize + 'px'});
        if (!(lassoMode && areaPoint.style('fill') === pointSelColor)) applyStyle(areaPoint, {'fill': pointOriColor});
    }
    applyStyle(areaPath, {'stroke': pathOriStrokeColor, 'stroke-width': sideElts[side].pathCrtStrokeSize});
}

/* Handler when user selects an area (click) */
function handleAreaClick() {
    const area = getArea(d3.select(this));
    const side = area[0].attr('id').startsWith('l') ? 'left' : 'right';
    applyAreaSelection(side, area, aggreMode, false);
    checkLabelZoomDisplay(side);
}

function applyAreaSelection(side, area, aggreMode, lassoMode) {
    const [areaPath, areaPoint, areaName] = area;
    const displayedName = areaName.text();
    if (aggreMode) {
        areaPath.classed('selected', !areaPath.classed('selected'));
        areaName.classed('selected', !areaName.classed('selected'));
        if (areaPath.classed('selected')) {
            sideElts[side].selectedAreas.unshift(displayedName);
            areaRaise(area);
            applyStyle(areaPath, {'fill': pathSelFillColor});
            applyStyle(areaPoint, {'fill': pointSelColor});
            applyStyle(areaName, {'fill': nameSelFontColor, 'font-weight': nameSelFontWeight, 'font-size': sideElts[side].nameCrtFontSize * nameFontSizeMult + 'px'});
        } else {
            sideElts[side].selectedAreas = sideElts[side].selectedAreas.filter(item => item !== displayedName);
            if (lassoMode) {
                areaLower(area);
                applyStyle(areaPoint, {'fill': pointOriColor});
                applyStyle(areaName, {'fill': nameOriFontColor, 'font-weight': nameOriFontWeight, 'font-size': sideElts[side].nameCrtFontSize + 'px'});
            }
            applyStyle(areaPath, {'fill': pathOriFillColor});
        }
    } else {
        if (!lassoMode) {
            clearSelection(side);
        }
        sideElts[side].selectedAreas.unshift(displayedName);
        areaPath.classed('selected', true);
        areaName.classed('selected', true);
        areaRaise(area);
        applyStyle(areaPath, {'fill': pathSelFillColor});
        applyStyle(areaPoint, {'fill': pointSelColor});
        applyStyle(areaName, {'fill': nameSelFontColor, 'font-weight': nameSelFontWeight, 'font-size': sideElts[side].nameCrtFontSize * nameFontSizeMult + 'px'});
    }
    updateSelectedAreas(side);
}

/**********************************************************************************************************************/
/* Deselects all areas */
function clearSelection(side) {
    sideElts[side].selectedAreas = ['All'];
    const allAreaPaths = d3.selectAll(`.${side}AreaPath`);
    const allAreaPoints = d3.selectAll(`.${side}AreaPoint`);
    const allAreaNames = d3.selectAll(`.${side}AreaName`);
    applyStyle(allAreaPaths, {'fill': pathOriFillColor});
    applyStyle(allAreaPoints, {'fill': pointOriColor});
    applyStyle(allAreaNames, {'fill': nameOriFontColor, 'font-weight': nameOriFontWeight, 'font-size': sideElts[side].nameCrtFontSize + 'px'});
    allAreaPaths.classed('selected', false);
    allAreaNames.classed('selected', false);
}

/**********************************************************************************************************************/
/* Utility functions */

/* Gets corresponding areaPoint and areaName nodes to areaPath node */
function getArea(areaPath) {
    const areaPoint = areaPath.data()[0].properties['AreaPoint'];
    const areaName = areaPath.data()[0].properties['AreaName'];
    return [areaPath, areaPoint, areaName];
}

/* Puts area behind all areas */
function areaLower(area) {
    for (let prop of area) {
        prop.lower();
    }
}

/* Puts area in front of all areas */
function areaRaise(area) {
    for (let prop of area) {
        prop.raise();
    }
}

/* Applies styles to a selection */
function applyStyle(selection, styles) {
    for (let s of Object.keys(styles)) {
        selection.style(s, styles[s]);
    }
}

/**********************************************************************************************************************/
/* Styling functions according to zoom level */

/* Keeps the original size of area names, area points and area borders */
function keepLabelSize(side, scale) {
    d3.selectAll(`.${side}AreaPoint`).attr('r', pointRadius/scale);
    let nameCrtFontSize = nameOriFontSize/scale;
    sideElts[side].nameCrtFontSize = nameCrtFontSize;
    d3.selectAll(`.${side}AreaName`).style('font-size', nameCrtFontSize + 'px');
    d3.selectAll(`.${side}AreaName.hovered, .${side}AreaName.selected`).style('font-size', nameCrtFontSize * nameFontSizeMult + 'px');
    let pathCrtStrokeSize = pathOriStrokeSize/scale;
    sideElts[side].pathCrtStrokeSize = pathCrtStrokeSize;
    d3.selectAll(`.${side}AreaPath, .${side}AreaUnselectablePath`).style('stroke-width', pathCrtStrokeSize);
    d3.selectAll(`.${side}AreaPath.hovered`).style('stroke-width', pathCrtStrokeSize * pathStrokeSizeMult);
}

/* Displays area names according to available space */
function checkLabelZoomDisplay(side) {
    let collisionsObject = {};
    let nodes = [];
    const areaNames = d3.selectAll(`.${side}AreaName`);
    areaNames.each(function(d) {
        const areaName = d3.select(this);
        const box = areaName.node().getBoundingClientRect();
        nodes.push({'areaName': areaName, 'box': box});
        collisionsObject[areaName.attr('id')] = {
            'areaName': areaName,
            'polygonArea': d['polygonArea'],
            'collidedAreaNameIds': [],
            'collisionCounter': 0
        };
    });
    for (let i = 0; i < nodes.length; i++) {
        const node1 = nodes[i];
        const areaName1 = node1['areaName'];
        const box1 = node1['box'];
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const node2 = nodes[j];
            const areaName2 = node2['areaName'];
            const box2 = node2['box'];
            if (checkOverlappingLabels(box1, box2)) {
                collisionsObject[areaName1.attr('id')]['collidedAreaNameIds'].push(areaName2.attr('id'));
                collisionsObject[areaName1.attr('id')]['collisionCounter']++;
            }
        }
    }
    function sortCollisions (x, y) {
        if (x['collisionCounter'] === y['collisionCounter']) {
            return x['polygonArea'] - y['polygonArea'];
        } else {
            return y['collisionCounter'] - x['collisionCounter'];
        }
    }
    let collisionsArray = Object.values(collisionsObject).sort(sortCollisions);
    while (collisionsArray[0].collisionCounter !== 0) {
        const removedCollisionObject = collisionsArray.shift();
        delete collisionsObject[removedCollisionObject['areaName'].attr('id')];
        for (let areaNameId of removedCollisionObject['collidedAreaNameIds']) {
            const collisionObject = collisionsObject[areaNameId];
            const collidedAreaNameIds = collisionObject['collidedAreaNameIds'];
            collidedAreaNameIds.splice(collidedAreaNameIds.indexOf(removedCollisionObject['areaName'].attr('id')), 1);
            collisionObject['collisionCounter']--;
        }
        removedCollisionObject['areaName'].style('opacity', 0);
        collisionsArray = Object.values(collisionsObject).sort(sortCollisions);
    }
    for (let collisionObject of collisionsArray) {
        collisionObject['areaName'].style('opacity', 1);
    }
}

/* Checks for overlapping area names */
function checkOverlappingLabels(box1, box2) {
    return !(box1.right < box2.left || box1.left > box2.right || box1.bottom < box2.top || box1.top > box2.bottom);
}

/**********************************************************************************************************************/
/* Updates selected areas list */
function updateSelectedAreas(side) {
    let lsaCounter = d3.select(`#${side}SelectedAreasCounter`);
    let lsaCounterText = lsaCounter.text();
    let selectedAreas = sideElts[side].selectedAreas;
    if (selectedAreas.includes('All') && selectedAreas.length > 1) {
        selectedAreas = selectedAreas.filter(item => item !== 'All');
    } else if (!selectedAreas.length) {
        selectedAreas.push('All');
    }
    sideElts[side].selectedAreas = selectedAreas;
    d3.select(`#${side}SelectedAreasList tbody`).selectAll('tr')
        .data(selectedAreas)
        .join(
            enter => enter.append('tr').append('td').text(d => { return d }),
            update => update.text(d => { return d }),
            exit => exit.remove()
        );
    if (!lsaCounterText.startsWith('s')) lsaCounterText = lsaCounterText.substr(lsaCounterText.indexOf(' '));
    if (lsaCounterText.endsWith('s')) lsaCounterText = lsaCounterText.slice(0, -1);
    const selectedAreasNumber = (selectedAreas.includes('All')) ? d3.selectAll(`.${side}AreaName`).size() : selectedAreas.length;
    lsaCounter.text(selectedAreasNumber + ' ' + lsaCounterText + ((selectedAreasNumber > 1) ? 's' : ''));
}

/**********************************************************************************************************************/
/* Middle Data Part */

//const ogDataUrl = '../data/populationReallySmall.csv';
const ogDataUrl = '../../data/populationSmall.csv';
//const ogDataUrl = '../data/populationReallySmallMonth.csv';

const oddataObject = {};
const oddataArray = [];

const odDDataObject = {};
const odDDataArray = [];
const odMDataObject = {};
const odMDataArray = [];
const odYDataObject = {};
const odYDataArray = [];

let hasYear;
let hasMonth;
let hasDay;

let odGeoLine;
let odTimeline;

let odZoom;

d3.csv(ogDataUrl).then(ODData => {
    hasYear = ODData[0].hasOwnProperty('Year');
    hasMonth = ODData[0].hasOwnProperty('Month');
    hasDay = ODData[0].hasOwnProperty('Day');

    createODDataObject(ODData);

    d3.select('#midBottomContainer').style('height', d3.select('#oddataContainer').node().getBoundingClientRect().height - (oddataFontSize * 3) + 'px');
    d3.selectAll('.geoLine').style('width', 5.5 * maxLength + 'px');
    d3.select('#bottomTimeContainer').style('height', oddataFontSize * 3 + 'px');
    d3.select('#midBsvg').on('mouseleave', () => { odTooltip.attr('id', 'odTooltip').style('display', 'none'); });

    createGeoLine();
    displayGeoLine();

    d3.select('#bottomTimeLine').style('width', d3.select('#midBsvg').node().getBoundingClientRect().width + 'px');

    createTimeline();
    displayTimeline();

    addNonExistingData();
    displayData();

    odZoom = addODZoom();
    d3.select('#midBsvg').call(odZoom);
});

let odScale = 1;
function addODZoom() {
    const bbox = d3.select('#midBsvg g').node().getBoundingClientRect();
    return d3.zoom()
        .on('zoom', (event) => {
            d3.select('#midBsvg g').attr('transform', event.transform);
            let newScale = event.transform.k;
            if (newScale !== odScale) {
                odScale = newScale;
                d3.select('.odRect.hovered').attr('stroke-width', 2 / odScale);
                createGeoLine();
                displayGeoLine();
                createTimeline();
                displayTimeline();
            }
            odTooltip.attr('id', 'odTooltip').style('display', 'none');
            d3.selectAll('.geoLine').style('transform', 'translateY(' + event.transform.y + 'px)');
            d3.select('#bottomTimeLine').style('transform', 'translateX(' + event.transform.x + 'px)')
            checkODTimeDisplay();
        })
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0],[bbox.width, bbox.height]]);
}

const idArray = [];
const existingDates = {};
let maxLength = 0;
let maxDataValue = 0;
function createODDataObject(ODData) {
    for (let oddata of ODData) {
        const id = oddata['OriginCode'] + '_' + oddata['DestinationCode'];
        idArray.push(id);
        const formattedDate = formatDate(oddata);
        existingDates[id + formattedDate] = '';
        oddataObject[id] = {origin: oddata['Origin'], destination: oddata['Destination']};

        //if (hasYear && !odYDataObject.hasOwnProperty(id)) odYDataObject[id] = {date: formattedDate.substr(0,4), data: 'n/a'};
        //if (hasMonth && !odMDataObject.hasOwnProperty(id)) odMDataObject[id] = {date: formattedDate.substr(0, 7), data: 'n/a'};
        //if (hasDay && !odDDataObject.hasOwnProperty(id)) odDDataObject[id] = {date: formattedDate, data: 'n/a'};

        maxLength = Math.max(Math.max(maxLength, oddata['Origin'].length), oddata['Destination'].length);
        for (const key in oddata) {
            if (key.endsWith('Data')) {
                const val = parseInt(oddata[key]);

                //if (odYDataObject[id].data === 'n/a') odYDataObject[id].data = val;
                //else odYDataObject[id].data += val;

                maxDataValue = Math.max(maxDataValue, val);
                oddataArray.push({id: id, origin: oddata['Origin'], destination: oddata['Destination'], date: formattedDate, data: val});
            }
        }
    }
}

function addNonExistingData() {
    for (const geoTick of odGeoLine.domain()) {
        for (const timeTick of odTimeline.domain()) {
            if (!existingDates.hasOwnProperty(geoTick + timeTick)) {
                const geoTickObj = oddataObject[geoTick];
                oddataArray.push({id: geoTick, origin: geoTickObj.origin, destination: geoTickObj.destination, date: timeTick, data: 'n/a'});
            }
        }
    }
    oddataArray.sort((d1, d2) => { return (d1['date'] < d2['date']) ? -1 : 1 });
}

let minDate;
let maxDate;
function formatDate(oddata) {
    let date = '';
    if (hasYear) date += oddata['Year'];
    if (hasMonth) date += ((date === '') ? '' : '.') + oddata['Month'];
    if (hasDay) date += ((date === '') ? '' : '.') + oddata['Day'];
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;
    return date;
}

let timeValues = [];
function createTimeline() {
    const minDateInfo = minDate.split('.');
    const maxDateInfo = maxDate.split('.');
    let start = new Date();
    let end = new Date();
    if (hasYear) {
        start.setFullYear(parseInt(minDateInfo.shift()));
        end.setFullYear(parseInt(maxDateInfo.shift()));
    }
    if (hasMonth) {
        start.setMonth(parseInt(minDateInfo.shift()) - 1);
        end.setMonth(parseInt(maxDateInfo.shift()) - 1);
    }
    if (hasDay) {
        start.setDate(parseInt(minDateInfo.shift()));
        end.setDate(parseInt(maxDateInfo.shift()));
    }

    let format = (hasYear) ? '%Y' : '';
    format += (hasMonth) ? ((hasYear) ? '.' : '') + '%m' : '';
    format += (hasDay) ? ((hasYear || hasMonth) ? '.' : '') + '%d' : '';
    const setFormat = d3.timeFormat(format);
    //let timeValues;
    if (hasDay) {
        start.setDate(start.getDate() - 1);
        //timeValues = d3.timeDays(start, end, 1).map(setFormat);
        timeValues[2] = d3.timeDays(start, end, 1).map(setFormat);
    } /*else*/ if (hasMonth) {
        start.setMonth(start.getMonth() - 1);
        //timeValues = d3.timeMonths(start, end, 1).map(setFormat);
        timeValues[1] = d3.timeMonths(start, end, 1).map(setFormat);
    } /*else*/ if (hasYear) {
        start.setFullYear(start.getFullYear() - 1);
        //timeValues = d3.timeYears(start, end, 1).map(setFormat);
        timeValues[0] = d3.timeYears(start, end, 1).map(setFormat);
    }

    odTimeline = d3.scaleBand()
        //.domain(timeValues)
        .domain(timeValues[0])
        .range([0, d3.select('#bottomTimeLine').node().getBoundingClientRect().width * odScale]);
}

function updateTimeline() {
    odTimeline = d3.scaleBand()
        .domain(timeValues[timeMode])
        .range([0, d3.select('#bottomTimeLine').node().getBoundingClientRect().width * odScale]);
}

function displayTimeline() {
    const bottomTimeLine = d3.select('#bottomTimeLine');
    const reducedDomain = getReducedDomain(odTimeline);
    d3.selectAll('.odTimeText').remove();
    for (let tick of reducedDomain) {
        bottomTimeLine.append('text')
            .attr('class', 'odTimeText')
            .text(tick)
            .style('left', (odTimeline(tick) + odTimeline.bandwidth()/2 - oddataFontSize) + 'px')
            .style('font-size', oddataFontSize + 'px')
            .style('fill', 'black');
    }
}

function createGeoLine() {
    odGeoLine = d3.scaleBand()
        .domain(idArray)
        .range([0, d3.select('#midBottomContainer').node().getBoundingClientRect().height * odScale]);
}

function displayGeoLine() {
    const originContainer = d3.select('#midOrigins');
    const destinationContainer = d3.select('#midDestinations');
    const reducedDomain = getReducedDomain(odGeoLine);
    d3.selectAll('.geoLine *').remove();
    for (let areaText of reducedDomain) {
        originContainer.append('text')
            .attr('class', 'originText')
            .text(oddataObject[areaText]['origin'])
            .style('top', (odGeoLine(areaText) + odGeoLine.bandwidth()/2 - oddataFontSize/2) + 'px')
            .style('font-size', oddataFontSize + 'px')
            .style('fill', 'black');
        destinationContainer.append('text')
            .attr('class', 'destinationText')
            .text(oddataObject[areaText]['destination'])
            .style('top', (odGeoLine(areaText) + odGeoLine.bandwidth()/2 - oddataFontSize/2) + 'px')
            .style('font-size', oddataFontSize + 'px')
            .style('fill', 'black');
    }
}

function getReducedDomain(line) {
    let spaceCheck = oddataFontSize * 1.5 / line.bandwidth();
    let reducedDomain = line.domain();
    if (spaceCheck > 1) {
        for (let i = 0; i < Math.ceil(Math.log(spaceCheck)/Math.log(2)); i++) {
            reducedDomain = reducedDomain.filter((d, i) => { return i % 2 === 0 });
        }
    }
    return reducedDomain;
}

function displayData() {
    const backs = [];
    const colorScale = d3.scaleSequential().domain([0, maxDataValue]).interpolator(d3.interpolateOrRd);
    d3.select('#midBsvg').append('g').selectAll('.rect').data(oddataArray).join(
        enter => enter.append('rect')
            .attr('id', d => { return d['id'] + d['date'] })
            .attr('class', 'odRect')
            .attr('width', odTimeline.bandwidth() + 'px')
            .attr('height', odGeoLine.bandwidth() + 'px')
            .attr('y', d => { return odGeoLine(d['id']) + 'px' })
            .attr('x', d => { return odTimeline(d['date']) + 'px' })
            .style('fill', d => {
                const data = d['data'];
                if (data === 'n/a') return 'grey';
                else return colorScale(d['data']);
            })
            .each( (d,i) => {
                const data = d['data'];
                const domainLength = odTimeline.domain().length;
                let back = (i < domainLength) ? 'n/a' : backs[i-domainLength];
                    backs[i] = back;
                d['diff'] = (back === 'n/a' || data === 'n/a') ? 'n/a' : data - back;
            })
            .on('mouseenter', handleODEnter)
            .on('mousemove', handleODOver)
            .on('mouseleave', handleODLeave)
            .on('click', handleODClick)
    );
}

function checkODTimeDisplay() {
    const leftLimit = d3.select('#midOrigins').node().getBoundingClientRect().right;
    const rightLimit = d3.select('#midDestinations').node().getBoundingClientRect().left;
    d3.selectAll('.odTimeText').each(function() {
        const text = d3.select(this);
        const bbox = text.node().getBoundingClientRect();
        if (bbox.right < leftLimit || bbox.left > rightLimit) {
            text.style('opacity', 0.3);
        } else {
            text.style('opacity', 1);
        }
    });
}

function handleODEnter() {
    const rect = d3.select(this);
    rect.raise();
    odEnterOver(rect);
    const data = rect.data()[0];
    let text = `${data['origin']} -> ${data['destination']}<br\/>${data['date']} : ${data['data']}<br\/>`;
    text += 'Diff : ' + data['diff'];
    $('#odTooltip').html(text);
}

function handleODOver() {
    const rect = d3.select(this);
    odEnterOver(rect);
}

function odEnterOver(rect) {
    rect.attr('stroke', 'black')
        .attr('stroke-width', 2 / odScale)
        .classed('hovered', true);
    const bbox = rect.node().getBoundingClientRect();
    const svgBottom = d3.select('#midBsvg').node().getBoundingClientRect().bottom;
    const tooltipHeight = odTooltip.node().getBoundingClientRect().height;
    odTooltip.attr('id', 'odTooltip')
        .style('top', (((svgBottom - bbox.bottom) < tooltipHeight) ? bbox.top : bbox.bottom) + 'px')
        .style('left', bbox.right + 'px')
        .style('display', 'block');
}

function handleODLeave() {
    d3.select(this)
        .attr('stroke', null)
        .attr('stroke-width', null)
        .classed('hovered', false);
}

let odTooltip = d3.select('body')
                    .append('div')
                    .style('position', 'absolute')
                    .style('z-index', '10')
                    .style('pointer-events', 'none')
                    .style('display', 'none')
                    .style('height', '3.5em')
                    .style('padding', '0.5em')
                    .style('border-radius', '10px')
                    .style('background', 'rgba(0,0,0,0.8)')
                    .style('font-size', oddataFontSize + 'px')
                    .style('color', 'white');

function handleODClick() {

}

const odTimeZoom = addODTimeZoom();
d3.select('#bottomTimeContainer').call(odTimeZoom);

let timeMode = 0;
let odTimeScale = 1;
function addODTimeZoom() {
    return d3.zoom()
        .on('zoom', (event) => {
            let newScale = event.transform.k;
            if (newScale !== odTimeScale) {
                if (newScale > odTimeScale && timeMode !== 2 && timeValues[timeMode+1]) {
                    timeMode++;
                } else if (newScale < odTimeScale && timeMode !== 0 && timeValues[timeMode-1]) {
                    timeMode--;
                }
                updateTimeline();
                displayTimeline();
                odTimeScale = newScale;
                /*const newTimeline = createTimeline();
                d3.selectAll('.odTimeText').remove();
                displayTimeline(newTimeline);
                checkODTimeDisplay();*/
            }
        })
        .filter((event) => { return event.shiftKey });
}

d3.select('#bottomFit').on('click', () => {
    d3.select('#midBsvg').transition().duration(fitDuration).call(
        odZoom.transform,
        d3.zoomIdentity
    );
});

/**********************************************************************************************************************/
/* Map generation procedure */

const pathProperties = ['Name', 'DisplayName'];                         // DisplayName is optional
const nodeProperties = ['Name', 'DisplayName', 'Code', 'Lat', 'Lon'];   // DisplayName is optional

/* Computes area (surface) of (multi)polygons */
function computePolygonArea(side, multiPolygon) {
    const pathGenerator = sideElts[side].pathGenerator;
    if (multiPolygon.type === 'Polygon') {
        return pathGenerator.area(multiPolygon);
    } else {
        let multiPolygonArea = 0;
        for (let polygon of multiPolygon.coordinates) {
            const newPolygon = {type: 'Polygon', coordinates: polygon};
            multiPolygonArea += pathGenerator.area(newPolygon);
        }
        return multiPolygonArea;
    }
}

/* Computes position according to latitude and longitude (also lon extra) */
function computeTranslateProperty(side, lon, lat) {
    let latExtra = 0;
    let lonExtra = 0;
    const projection = sideElts[side].projection;
    if (lon < -180 || lon > 180) {
        const sign = Math.sign(lon);
        lonExtra = sign * ((Math.abs(lon) / 180) - 1) * projection([180, 0])[0];
        lon = sign * 180;
    }
    const extra = [lonExtra, latExtra];
    return projection([lon, lat]).map((e, i) => e + extra[i]);
}

/* Load information from different files */
function loadAreaData(side, pathsFileUrl, nodesFileUrl, shapesFileUrl, callback) {
    d3.select(`#${side}Loading`).transition().duration(500).style('opacity', 1)
        .on('start', function () { d3.select(this).style('display', 'block'); })
        .on('end', () => {
            d3.json(pathsFileUrl).then(areaPaths => {
                const svg = sideElts[side].svg;
                let projection = d3.geoMercator().fitSize([svg.node().getBoundingClientRect().width, svg.node().getBoundingClientRect().height], areaPaths);
                sideElts[side].projection = projection;
                sideElts[side].pathGenerator = d3.geoPath().projection(projection);
                d3.csv(nodesFileUrl).then(areaNodes => {
                    if (shapesFileUrl) {
                        d3.csv(shapesFileUrl).then(areaShapes => {
                            callback(side, areaPaths, areaNodes, areaShapes);
                        });
                    } else {
                        callback(side, areaPaths, areaNodes);
                    }
                });
            });
        });
}

let polygonsArea;
let polygonCounter;
let polygonAvgArea;

/* Creates an object of areas (areaData) containing useful information */
function createAreaObject(side, areaPaths, areaNodes, areaShapes) {
    polygonsArea = 0;
    polygonCounter = 0;
    const areaData = sideElts[side].areaData;
    const areaShapesDefault = sideElts[side].areaShapesDefault;
    for (let feature of areaPaths.features) {
        for (let k of Object.keys(feature.properties)) {
            if (!pathProperties.includes(k)) delete feature.properties[k];
        }
        const name = feature.properties['Name'];
        areaData[name] = {};
        areaData[name]['DisplayName'] = feature.properties?.['DisplayName'];
        const polygonArea = computePolygonArea(side, feature.geometry);
        areaData[name]['PolygonArea'] = polygonArea;
        polygonsArea += polygonArea;
        polygonCounter++;
    }

    polygonAvgArea = polygonsArea / polygonCounter;

    for (let areaNode of areaNodes) {
        for (let k of Object.keys(areaNode)) {
            if (!nodeProperties.includes(k)) delete areaNode[k];
        }
        const name = areaNode['Name'];

        if (!areaData.hasOwnProperty(name)) areaData[name] = {};
        areaData[name]['Code'] = areaNode['Code'];
        areaData[name]['Lat'] = areaNode['Lat'];
        areaData[name]['Lon'] = areaNode['Lon'];
        areaData[name]['DisplayName'] ||= areaNode?.['DisplayName'] || name;
        if (!areaData[name].hasOwnProperty('PolygonArea')) {
            areaData[name]['PolygonArea'] = polygonAvgArea;
            areaShapesDefault.push({'Name': name, 'Shape': 'rect', 'AreaScale': 1});
        }
    }

    if (areaShapes) {
        for (let i = 0; i < areaShapes.length; i++) {
            for (let j = 0; j < areaShapesDefault.length; j++) {
                if (areaShapes[i]['Name'] === areaShapesDefault[j]['Name']) {
                    areaShapesDefault[j] = areaShapes[i];
                }
            }
        }
    }
    d3.select(`#${side}Loading`).transition().duration(500).style('opacity', 0).on('end', function () {
        d3.select(this).style('display', 'none');
        createMap(side, areaPaths, areaNodes, areaShapesDefault);
    });
}

/* Creates and renders rectangle shapes */
function createRect(rect, side, d) {
    const name = d['Name'];
    const areaScale = d['AreaScale'];
    const shapeHeight = Math.sqrt(areaScale * polygonAvgArea / rectWidthHeightRatio);
    const roundedCorner = rectRoundedCornerRatio * shapeHeight + 'px';
    const areaData = sideElts[side].areaData;
    const [lon, lat] = computeTranslateProperty(side, areaData[name]['Lon'], areaData[name]['Lat']);
    areaData[name]['PolygonArea'] *= areaScale;
    rect
        .attr('class', `${side}AreaPath`)
        .attr('id', `${side}AreaPath_` + areaData[name]['Code'])
        .attr('width', rectWidthHeightRatio * shapeHeight)
        .attr('height', shapeHeight)
        .attr('x', lon - rectWidthHeightRatio/2 * shapeHeight)
        .attr('y', lat - 1/2 * shapeHeight)
        .attr('rx', roundedCorner)
        .attr('ry', roundedCorner)
        .style('fill', pathOriFillColor)
        .style('stroke', pathOriStrokeColor);
}

/* Creates and renders circle shapes */
function createCircle(circle, side, d) {
    const name = d['Name'];
    const areaScale = d['AreaScale'];
    const areaData = sideElts[side].areaData;
    const [lon, lat] = computeTranslateProperty(side, areaData[name]['Lon'], areaData[name]['Lat']);
    areaData[name]['PolygonArea'] *= areaScale;
    circle
        .attr('class', `${side}AreaPath`)
        .attr('id', `${side}AreaPath_` + areaData[name]['Code'])
        .attr('r', Math.sqrt(areaScale * polygonAvgArea / Math.PI))
        .attr('cx', lon)
        .attr('cy', lat)
        .style('fill', pathOriFillColor)
        .style('stroke', pathOriStrokeColor);
}

/* Creates html elements and renders the map */
function createMap(side, areaPaths, areaNodes, areaShapes) {
    d3.select(`#${side}SelectedAreasList`).style('opacity', 1);
    d3.select(`#${side}bottomButtonContainer`).style('opacity', 1);
    d3.select('#flowLegend').style('opacity', 1);
    const firstG = sideElts[side].firstG;
    const areaData = sideElts[side].areaData;
    firstG.append('g').selectAll('.areaPathSel').data(areaPaths.features).enter()
        .append('path')
        .each(function (d) {
            const code = areaData[d.properties['Name']]?.['Code'];
            const areaPath = d3.select(this);
            if (code !== undefined) {
                areaPath
                    .attr('class', `${side}AreaPath`)
                    .attr('id', `${side}AreaPath_` + code);
            } else {
                areaPath.attr('class', `${side}AreaUnselectablePath`);
            }
        })
        .attr('d', sideElts[side].pathGenerator)
        .style('fill', pathOriFillColor)
        .style('stroke', pathOriStrokeColor)
        .style('stroke-width', pathOriStrokeSize);

    const areaShapesSel = firstG.select('g').selectAll('.areaShapeSel').data(areaShapes).enter();
    areaShapesSel.append('rect')
        .filter(d => { return d['Shape'] === 'rect' })
        .each(function(d) { const rect = d3.select(this); createRect(rect, side, d) });
    areaShapesSel.append('circle')
        .filter(d => { return d['Shape'] === 'circle' })
        .each(function(d) { const circle = d3.select(this); createCircle(circle, side, d) });

    firstG.append('g').selectAll('.areaPointSel').data(areaNodes).enter()
        .append('circle')
        .attr('class', `${side}AreaPoint`)
        .attr('id', d => { return `${side}AreaPoint_` + d['Code'] })
        .attr('cx', d => { return computeTranslateProperty(side, d['Lon'], 0)[0] })
        .attr('cy', d => { return computeTranslateProperty(side, 0, d['Lat'])[1] })
        .attr('r', pointRadius)
        .style('fill', pointOriColor);

    firstG.append('g').selectAll('.areaNameSel').data(areaNodes).enter()
        .append('text')
        .attr('class', `${side}AreaName`)
        .attr('id', d => { return `${side}AreaName_` + d['Code'] })
        .attr('transform', d => { return 'translate(' + computeTranslateProperty(side, d['Lon'], d['Lat']) + ')' })
        .each(d => { d['PolygonArea'] = areaData[d['Name']]['PolygonArea'] })
        .style('font-size', nameOriFontSize + 'px')
        .style('fill', nameOriFontColor)
        .text(d => { return areaData[d['Name']]['DisplayName'] });

    d3.selectAll(`.${side}AreaPath`)
        .each(function (d) {
            const areaPath = d3.select(this);
            if (!d.hasOwnProperty('properties')) d.properties = {};
            d.properties['AreaPoint'] = d3.select(`#${side}AreaPoint_` + areaPath.attr('id').split('_')[1]);
            d.properties['AreaName'] = d3.select(`#${side}AreaName_` + areaPath.attr('id').split('_')[1]);
        })
        .on('mouseenter', handleAreaEnter)
        .on('mouseleave', handleAreaLeave)
        .on('click', handleAreaClick);

    checkLabelZoomDisplay(side);
    updateSelectedAreas(side);
}