const leftsvg = d3.select('#leftsvg');
const leftG = leftsvg.append('g');
const rightsvg = d3.select('#rightsvg');
const rightG = rightsvg.append('g');

sideElts = {
    left: {
        svg: leftsvg,
        firstG: leftG,
        scale: 1,
        selectedAreas: ['All'],
        nameCrtFontSize: nameOriFontSize,
        pathCrtStrokeSize: pathOriStrokeSize,
        areaData: {},
        areaShapesDefault: []
    },
    right: {
        svg: rightsvg,
        firstG: rightG,
        scale: 1,
        selectedAreas: ['All'],
        nameCrtFontSize: nameOriFontSize,
        pathCrtStrokeSize: pathOriStrokeSize,
        areaData: {},
        areaShapesDefault: []
    }
};

/* Adds a map according to side */
function addMap(side, areaPaths, areaNodes, areaShapes) {
    const zoom = addMapZoomBehavior(side);
    sideElts[side].svg.call(zoom);
    const drag = addMapDragBehavior(side);
    sideElts[side].svg.call(drag);
    sideElts[side].zoom = zoom;
    addBottomButtonHandlers(side);
    createAreaObject(side, areaPaths, areaNodes, areaShapes);
}

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
            if (onLSvg) d3.select('#leftAggreModeNotify').style('display', 'block');
            else if (onRSvg) d3.select('#rightAggreModeNotify').style('display', 'block');
        }
        if (e.key === 'Shift') {
            lassoMode = true;
            if (onLSvg) d3.select('#leftLassoModeNotify').style('display', 'block');
            else if (onRSvg) d3.select('#rightLassoModeNotify').style('display', 'block');
        }
    };
    document.onkeyup = (e) => {
        if (e.key === 'Control') {
            aggreMode = false;
            if (onLSvg) d3.select('#leftAggreModeNotify').style('display', 'none');
            else if (onRSvg) d3.select('#rightAggreModeNotify').style('display', 'none');
        }
        if (e.key === 'Shift') {
            lassoMode = false;
            if (onLSvg) d3.select('#leftLassoModeNotify').style('display', 'none');
            if (onRSvg) d3.select('#rightLassoModeNotify').style('display', 'none');
        }
    };
    leftsvg.on('mouseenter', () => {
        onLSvg = true;
        if (aggreMode) d3.select('#leftAggreModeNotify').style('display', 'block');
        if (lassoMode) d3.select('#leftLassoModeNotify').style('display', 'block');
    });
    leftsvg.on('mouseleave', () => {
        onLSvg = false;
        if (aggreMode) d3.select('#leftAggreModeNotify').style('display', 'none');
        if (lassoMode) d3.select('#leftLassoModeNotify').style('display', 'none');
    });
    rightsvg.on('mouseenter', () => {
        onRSvg = true;
        if (aggreMode) d3.select('#rightAggreModeNotify').style('display', 'block');
        if (lassoMode) d3.select('#rightLassoModeNotify').style('display', 'block');
    });
    rightsvg.on('mouseleave', () => {
        onRSvg = false;
        if (aggreMode) d3.select('#rightAggreModeNotify').style('display', 'none');
        if (lassoMode) d3.select('#rightLassoModeNotify').style('display', 'none');
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

/* Applies styles according to area selection */
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
/* Map generation procedure */

const pathProperties = ['Code'];
const nodeProperties = ['Name', 'Code', 'Lat', 'Lon'];

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
        const code = feature.properties['Code'];
        areaData[code] = {};
        const polygonArea = computePolygonArea(side, feature.geometry);
        areaData[code]['PolygonArea'] = polygonArea;
        polygonsArea += polygonArea;
        polygonCounter++;
    }

    polygonAvgArea = polygonsArea / polygonCounter;

    for (let areaNode of areaNodes) {
        for (let k of Object.keys(areaNode)) {
            if (!nodeProperties.includes(k)) delete areaNode[k];
        }
        const code = areaNode['Code'];
        if (!areaData.hasOwnProperty(code)) areaData[code] = {};
        areaData[code]['Lat'] = areaNode['Lat'];
        areaData[code]['Lon'] = areaNode['Lon'];
        areaData[code]['Name'] = areaNode['Name'];
        if (!areaData[code].hasOwnProperty('PolygonArea')) {
            areaData[code]['PolygonArea'] = polygonAvgArea;
            areaShapesDefault.push({Code: code, Shape: 'rect', AreaScale: 1});
        }
    }

    sideElts[side].areaNodes = areaNodes;

    if (areaShapes) {
        for (let i = 0; i < areaShapes.length; i++) {
            for (let j = 0; j < areaShapesDefault.length; j++) {
                if (areaShapes[i]['Code'] === areaShapesDefault[j]['Code']) {
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
    const code = d['Code'];
    const areaScale = d['AreaScale'];
    const shapeHeight = Math.sqrt(areaScale * polygonAvgArea / rectWidthHeightRatio);
    const roundedCorner = rectRoundedCornerRatio * shapeHeight + 'px';
    const areaData = sideElts[side].areaData;
    const [lon, lat] = computeTranslateProperty(side, areaData[code]['Lon'], areaData[code]['Lat']);
    areaData[code]['PolygonArea'] *= areaScale;
    rect
        .attr('class', `${side}AreaPath`)
        .attr('id', `${side}AreaPath_${code}`)
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
    const code = d['Code'];
    const areaScale = d['AreaScale'];
    const areaData = sideElts[side].areaData;
    const [lon, lat] = computeTranslateProperty(side, areaData[code]['Lon'], areaData[code]['Lat']);
    areaData[code]['PolygonArea'] *= areaScale;
    circle
        .attr('class', `${side}AreaPath`)
        .attr('id', `${side}AreaPath_${code}`)
        .attr('r', Math.sqrt(areaScale * polygonAvgArea / Math.PI))
        .attr('cx', lon)
        .attr('cy', lat)
        .style('fill', pathOriFillColor)
        .style('stroke', pathOriStrokeColor);
}

/* Creates html elements and renders the map */
function createMap(side, areaPaths, areaNodes, areaShapes) {
    d3.select(`#${side}SelectedAreasList`).style('opacity', 1);
    d3.select(`#${side}BottomButtonContainer`).style('opacity', 1);
    d3.select('#flowLegend').style('opacity', 1);
    const firstG = sideElts[side].firstG;
    const areaData = sideElts[side].areaData;
    firstG.append('g').selectAll('.areaPathSel').data(areaPaths.features).enter()
        .append('path')
        .each(function (d) {
            const code = d['properties']['Code'];
            const name = areaData[code]['Name'];
            const areaPath = d3.select(this);
            if (name) {
                areaPath
                    .attr('class', `${side}AreaPath`)
                    .attr('id', `${side}AreaPath_${code}`);
            } else {
                areaPath.attr('class', `${side}AreaUnselectablePath`);
            }
        })
        .attr('d', sideElts[side].pathGenerator)
        .style('fill', pathOriFillColor)
        .style('stroke', pathOriStrokeColor)
        .style('stroke-width', pathOriStrokeSize);

    const areaShapesSel = firstG.append('g').selectAll('.areaShapeSel').data(areaShapes).enter();
    areaShapesSel.filter(d => { return d['Shape'] === 'rect' })
        .append('rect')
        .each(function(d) {
            const rect = d3.select(this);
            createRect(rect, side, d);
        });
    areaShapesSel.filter(d => { return d['Shape'] === 'circle' })
        .append('circle')
        .each(function(d) {
            const circle = d3.select(this);
            createCircle(circle, side, d);
        });

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
        .each(d => { d['PolygonArea'] = areaData[d['Code']]['PolygonArea'] })
        .style('font-size', nameOriFontSize + 'px')
        .style('fill', nameOriFontColor)
        .text(d => { return areaData[d['Code']]['Name'] });

    d3.selectAll(`.${side}AreaPath`)
        .each(function (d) {
            const areaPath = d3.select(this);
            if (!d.hasOwnProperty('properties')) d['properties'] = {};
            d['properties']['AreaPoint'] = d3.select(`#${side}AreaPoint_` + areaPath.attr('id').split('_')[1]);
            d['properties']['AreaName'] = d3.select(`#${side}AreaName_` + areaPath.attr('id').split('_')[1]);
        })
        .on('mouseenter', handleAreaEnter)
        .on('mouseleave', handleAreaLeave)
        .on('click', handleAreaClick);

    checkLabelZoomDisplay(side);
    updateSelectedAreas(side);
}