let altZoom;
let altGeoZoom;
let altTimeZoom;

let altGeoScaleBand;
let altTimeScaleBand;
let altInitialGeoScaleBand;
let altInitialTimeScaleBand;

const altDataContainer = d3.select('#altDataContainer');
const altGeoContainer = d3.select('#altGeoContainer');
const altTimeContainer = d3.select('#altTimeContainer');
const altTimeLineContainer = d3.select('#altTimeLineContainer');

let altCanvasBox;
const altCanvas = d3.select('#altCanvas');
const altGeoCanvas = d3.select('#altGeoCanvas');

const altGeoLine = d3.select('.altGeoLine');
const altLegendContainer = d3.select('#altLegendContainer');

const altLeftTimeHider = d3.select('#altLeftTimeHider');
const altRightTimeHider = d3.select('#altRightTimeHider');

const altLegendArea = d3.select('#altLegendArea');

let altIdArray;
let altDataArray;

/**********************************************************************************************************************/
/* Applies different styles (heights and widths) according to Alt data */
function applyAltStyles(maxTimeLength, maxGeoLength) {
    const timeHeight = Math.ceil(maxTimeLength) + timeHeightMargin;
    const geoWidth = Math.ceil(maxGeoLength);
    //const geoHeight = Math.ceil(altDataContainer.node().getBoundingClientRect().height - timeHeight); //resize
    const geoHeight = Math.ceil(document.body.clientHeight * datasetGraphicRatio - timeHeight);

    altGeoContainer
        .style('height', geoHeight + 'px')
        .attr('height', geoHeight);
    d3.selectAll([...altGeoLine, ...altLegendContainer])
        .style('width', geoWidth + 'px')
        .style('height', geoHeight + 'px')
        .attr('width', geoWidth)
        .attr('height', geoHeight);

    altLeftTimeHider.style('width', geoWidth + 'px');
    altRightTimeHider.style('width', geoWidth + 'px');
    altTimeContainer.style('height', timeHeight + 'px');

    //const altCanvasWidth = altDataContainer.node().getBoundingClientRect().width - 2 * geoWidth;  //resize
    const altCanvasWidth = document.body.clientWidth * midPaneWidthRatio - 2 * geoWidth;
    altTimeLineContainer.style('width', altCanvasWidth + 'px');
    altCanvas
        .style('height', geoHeight + 'px')
        .style('width', altCanvasWidth + 'px')
        .attr('height', geoHeight)
        .attr('width', altCanvasWidth);

    altCanvasBox = {};
    altCanvasBox.top = 5/100 * document.body.clientHeight + timeHeight;
    altCanvasBox.left = document.body.clientWidth / 4 + geoWidth;
    altCanvasBox.height = Math.ceil(altCanvas.attr('height'));
    altCanvasBox.width = Math.ceil(altCanvas.attr('width'));
    altCanvasBox.right = altCanvasBox.left + altCanvasBox.width;
    altCanvasBox.bottom = altCanvasBox.top + altCanvasBox.height;
}

/* Adds Alternative(Alt) Data Map */
function addAltMap() {
    displayAltGeoLine(false);
    displayAltTimeLine(false);

    altInitialTimeScaleBand = altTimeScaleBand;
    altInitialGeoScaleBand = altGeoScaleBand;

    createGeoGraphics();
    createAltGraphics();

    drawAltData();

    altDataContainer.style('opacity', 1);

    altZoom = createAltZoom();
    altCanvas.call(altZoom).on('wheel.zoom', null);
    altGeoZoom = createAltGeoZoom();
    altGeoLine.call(altGeoZoom).on('mousedown.zoom', null);
    altTimeZoom = createAltTimeZoom();
    altTimeLineContainer.call(altTimeZoom).on('mousedown.zoom', null);
}

/**********************************************************************************************************************/
/* Alt Graphics creation procedure */

const altGraphics = new PIXI.Graphics();
const altHighlightedGraphics = new PIXI.Graphics();
const altClickedGraphics = new PIXI.Graphics();
const geoStage = new PIXI.Container();

let altGeoRenderer; //resize
let altRenderer;

/* Creates geo PIXI graphics (geo text for Alt data) */
function createGeoGraphics() {
    const rendererOptions = {
        width: altGeoCanvas.node().getBoundingClientRect().width,
        height: altGeoCanvas.node().getBoundingClientRect().height,
        backgroundColor: '0xffffff',
        antialias: true,
        view: altGeoCanvas.node()
    };
    //const renderer = PIXI.autoDetectRenderer(rendererOptions);    //resize
    altGeoRenderer = PIXI.autoDetectRenderer(rendererOptions);
    animate();
    function animate() {
        //renderer.render(geoStage);    //resize
        altGeoRenderer.render(geoStage);
        requestAnimationFrame(animate);
    }
}

/* Creates Alt Pixi graphics */
function createAltGraphics() {
    const rendererOptions = {
        width: altCanvasBox.width,
        height: altCanvasBox.height,
        backgroundColor: dataBackgroundColor,
        antialias: true,
        view: altCanvas.node()
    };
    //const renderer = PIXI.autoDetectRenderer(rendererOptions);    //resize
    altRenderer = PIXI.autoDetectRenderer(rendererOptions);
    const stage = new PIXI.Container();

    animate();
    function animate() {
        //renderer.render(stage);   //resize
        altRenderer.render(stage);
        requestAnimationFrame(animate);
    }

    //createAltTooltipInteraction(renderer);    //resize
    createAltTooltipInteraction(altRenderer);

    stage.addChild(altGraphics);
    stage.addChild(altHighlightedGraphics);
    stage.addChild(altClickedGraphics);
}

/**********************************************************************************************************************/
/* Alt Graphics update procedure */

/* Updates Alt Data and then fires drawing method */
function updateAltData() {
    selectAltData();
    if (isGroupByGeo) applyAltGrouping();
    applyAltSorting();
    updateGlobalData(altDataObject, false, altColorInterpolators[dataSetValue]);
    redrawAltData(true);
}

/* Redraws Alt Data with different geoScale/zoom level */
function redrawAltData(resetGeoZoom) {
    altGeoDOMZoomedLines = [];
    displayAltGeoLine(false);
    altInitialGeoScaleBand = createScaleBand(altIdArray, altCanvasBox.height);
    if (resetGeoZoom) {
        altGeoLine.call(altGeoZoom.transform, d3.zoomIdentity);
        altGeoZoom.scaleExtent([1, Math.ceil(altCanvas.attr('height')/altGeoScaleBand.bandwidth())]);
    }
    drawAltData();
}

/* Draws Alt Data on PIXI graphic */
function drawAltData() {
    altGraphics.clear();
    for (const altdata of altDataArray) {
        for (const time in altdata[typeAltOptionValue].data?.total) {
            const data = altdata[typeAltOptionValue].data.total[time];
            const colorScale = getAltColorScale(altdata, data);
            altGraphics.beginFill('0x' + d3.color(colorScale(data)).formatHex().substr(1));
            altGraphics.drawRect(altInitialTimeScaleBand(time), altInitialGeoScaleBand(altdata.id), altInitialTimeScaleBand.bandwidth(), altInitialGeoScaleBand.bandwidth());
            altGraphics.endFill();
        }
    }
    if (clickedAltDataLine) updateAltClickedGraphics();
}

/* Updates Alt PIXI graphics */
function updateAltGraphics() {
    altGraphics.position.x = altX;
    altGraphics.position.y = altY;
    altGraphics.scale.x = altTimeK;
    altGraphics.scale.y = altGeoK;
    altHighlightedGraphics.position.x = altX;
    altHighlightedGraphics.position.y = altY;
    altHighlightedGraphics.hitArea = new PIXI.Rectangle(Math.abs(altX), Math.abs(altY), altCanvasBox.width, altCanvasBox.height);
    altClickedGraphics.position.x = altX;
    altClickedGraphics.position.y = altY;
    if (clickedAltDataLine) updateAltClickedGraphics();
}

/* Updates Alt clicked black rectangle */
function updateAltClickedGraphics() {
    altClickedGraphics.clear();
    const y = altGeoScaleBand(clickedAltDataLine.id);
    if (_.isNumber(y)) {
        altClickedGraphics.beginFill(0xFFFFFF, 0.0);
        altClickedGraphics.lineStyle(rectClickedLineWidth, rectClickedLineColor);
        altClickedGraphics.drawRect(0, y, altCanvasBox.width * altTimeK, altGeoScaleBand.bandwidth());
        altClickedGraphics.endFill();
    }
}

/**********************************************************************************************************************/
/* Alt data information (tooltip) creation */

function createAltTooltipInteraction(renderer) {
    altHighlightedGraphics.interactive = true;
    altHighlightedGraphics.buttonMode = true;
    altHighlightedGraphics.hitArea = new PIXI.Rectangle(0, 0, altCanvasBox.width, altCanvasBox.height);
    const interactionManager = renderer.plugins['interaction'];
    altHighlightedGraphics
        .on('mousemove', (event) => {
            if (interactionManager.hitTest(event.data.global, altHighlightedGraphics)) {
                const pos = event.data.getLocalPosition(altHighlightedGraphics);
                const x = pos.x;
                const y = pos.y;

                const geoScaleBandwidth = altGeoScaleBand.bandwidth();
                const timeScaleBandwidth = altTimeScaleBand.bandwidth();

                altHighlightedGraphics.clear();
                altHighlightedGraphics.beginFill(0xFFFFFF, 0.0);
                altHighlightedGraphics.lineStyle(1, 0x000000);
                altHighlightedGraphics.drawRect(x - (x % timeScaleBandwidth), y - (y % geoScaleBandwidth), timeScaleBandwidth, geoScaleBandwidth);
                altHighlightedGraphics.endFill();

                const xIdentifier = altTimeScaleBand.domain()[Math.floor(x / timeScaleBandwidth)];
                const yIdentifier = altGeoScaleBand.domain()[Math.floor(y / geoScaleBandwidth)];
                const dataLine = altDataObject.data[yIdentifier];
                const data = dataLine[typeAltOptionValue].data?.total?.[xIdentifier];
                let tooltipText = `${dataLine.geo}<br>`;
                const roundedData = tooltipRoundData(data);
                tooltipText += `${xIdentifier} : ${roundedData || '-'}<br>`;
                if (!isNaN(roundedData) && altDataObject.dataColumnNames.length > 1) {
                    for (const columnData of altDataObject.dataColumnNames) {
                        tooltipText += `${columnData} : ${tooltipRoundData(dataLine[typeAltOptionValue].data[columnData]?.[xIdentifier]) || '-'}<br>`;
                    }
                }
                tooltip.html(tooltipText);

                const globalPos = altHighlightedGraphics.toGlobal(new PIXI.Point(x - (x % timeScaleBandwidth) + timeScaleBandwidth, y - (y % geoScaleBandwidth)));
                const gx = globalPos.x;
                const gy = globalPos.y;
                tooltip.style('bottom', document.body.clientHeight - altCanvasBox.top - gy - ((gy < 0) ? geoScaleBandwidth : 0) + 'px')
                        .style('left', altCanvasBox.left + gx - ((gx > altCanvasBox.width) ? timeScaleBandwidth : 0) + 'px')
                        .style('display', 'block');

                colorAltAreaOnHover(dataLine, data, xIdentifier, false);
                displayAltLegendContent(dataLine, false);
            }
        })
        .on('mouseout', () => {
            altHighlightedGraphics.clear();
            tooltip.style('display', 'none');
            altLegendCheckboxHandler();
            clearLastAltAreaHoverColor();
            lastAltAreaPath = undefined;
            lastAltAreaPathID = undefined;
        })
        .on('click', (event) => {
            const pos = event.data.getLocalPosition(altHighlightedGraphics);

            const geoScaleBandwidth = altGeoScaleBand.bandwidth();

            const yIdentifier = altGeoScaleBand.domain()[Math.floor(pos.y / geoScaleBandwidth)];
            const dataLine = altDataObject.data[yIdentifier];

            const tmpClickedAltDataLine = _.cloneDeep(dataLine);
            clickedAltDataLine = {...tmpClickedAltDataLine, ..._.cloneDeep(dataLine[typeAltOptionValue])};
            delete clickedAltDataLine.original;
            delete clickedAltDataLine.difference;
            drawAltComparedData();

            updateAltClickedGraphics();

            tooltip.style('display', 'block');
        });
}

/**********************************************************************************************************************/
/* Area coloration functions */

let lastAltAreaPath;
let lastAltAreaPathID;
let lastAltTime;
let altTimeout;

function colorAltAreaOnHover(dataLine, data, newTime, hoverOnCompared) {
    const newAltAreaPath = [];
    let newAltAreaPathID = '';
    if (Array.isArray(dataLine.geoCode)) {
        for (const oneGeoCode of dataLine.geoCode) {
            newAltAreaPath.push(d3.select('#leftAreaPath_' + removeLastDigits(oneGeoCode)));
            newAltAreaPathID += oneGeoCode;
        }
    } else {
        newAltAreaPath.push(d3.select('#leftAreaPath_' + removeLastDigits(dataLine.geoCode)));
        newAltAreaPathID = dataLine.geoCode;
    }

    if (lastAltAreaPathID !== newAltAreaPathID || lastAltTime !== newTime) {
        clearLastAltAreaHoverColor();
        altTimeout = setTimeout(() => {
            if (data) { //TODO flowstratesplus
                const colorScale = hoverOnCompared ? getDiffOriColorScale(dataLine.colorScale, data) : getAltColorScale(dataLine, data);
                if (colorScale(data)) {
                    for (const areaPath of newAltAreaPath) {
                        areaPath.style('fill', colorScale(data));
                    }
                }
            }
        }, areaHoverColorTimeout);
        lastAltAreaPath = newAltAreaPath;
        lastAltAreaPathID = newAltAreaPathID;
        lastAltTime = newTime;
    }
}

/* Removes colors from last hovered area */
function clearLastAltAreaHoverColor() {
    if (altTimeout) clearTimeout(altTimeout);
    if (lastAltAreaPath) {
        for (const areaPath of lastAltAreaPath) {
            const pathOriFillCondition = sideElts.left.selectedAreas[0] === 'All' || !sideElts.left.selectedAreas.includes(areaPath.attr('id').split('_')[1]);
            areaPath.style('fill', pathOriFillCondition ? pathOriFillColor : pathSelFillColor);
        }
    }
}

/* Gets colorScale according to data, typeAltOptionValue and local/global colorScale */
function getAltColorScale(dataLine, data) {
    const colorScale = isAltLocalColorScale ? dataLine[typeAltOptionValue].colorScale : altDataObject.globalData[typeAltOptionValue].colorScale;
    return getDiffOriColorScale(colorScale, data);
}

/**********************************************************************************************************************/
/* Alt Data and metrics interaction creation */

let altLoopBlock = false;

let altX = 0;
let altY = 0;
let altLastX = 0;
let altLastY = 0;
let altGeoLastY = 0;
let altTimeLastX = 0;
let altTimeK = 1;
let altGeoK = 1;

/* Creates zoom interaction for Alt time metric */
function createAltTimeZoom() {
    return d3.zoom()
        .scaleExtent([1, Math.ceil(altCanvas.attr('width')/altTimeScaleBand.bandwidth())])
        .translateExtent([[0, 0], [altCanvas.attr('width'), altTimeContainer.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('zoom', (event) => {
            altTimeK = event.transform.k;
            altX = event.transform.x;
            const transX = altX - altTimeLastX;
            altTimeLastX = altX;
            
            displayAltTimeLine(altLoopBlock);
            
            if (!altLoopBlock) {
                altLoopBlock = true;
                altCanvas.call(altZoom.translateBy, transX, 0);
                altLoopBlock = false;

                if (!isODAltSync) {
                    isODAltSync = true;
                    odTimeLineContainer.call(odTimeZoom.transform, event.transform);  // Sync timeline with OD Data
                    isODAltSync = false;
                }

            }
        });
}

/* Creates zoom interaction for Alt geographical metric */
function createAltGeoZoom() {
    return d3.zoom()
        .scaleExtent([1, Math.ceil(altCanvas.attr('height')/altGeoScaleBand.bandwidth())])
        .translateExtent([[0, 0],[altGeoLine.attr('width'), altCanvas.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('zoom', (event) => {
            altGeoK = event.transform.k;
            altY = event.transform.y;
            const transY = altY - altGeoLastY;
            altGeoLastY = altY;
            
            displayAltGeoLine(altLoopBlock);
            
            if (!altLoopBlock) {
                altLoopBlock = true;
                altCanvas.call(altZoom.translateBy, 0, transY);
                altLoopBlock = false;
            }
        });
}

let altBandGeo4Zoom;
let altDomaGeo4Zoom;
let altBandTime4Zoom;
let altDomaTime4Zoom;

/* Creates zoom (drag) interaction for Alt data */
function createAltZoom() {
    return d3.zoom()
        .on('start', () => {
            altBandGeo4Zoom = altGeoScaleBand.bandwidth();
            altDomaGeo4Zoom = altGeoScaleBand.domain().length;
            altBandTime4Zoom = altTimeScaleBand.bandwidth();
            altDomaTime4Zoom = altTimeScaleBand.domain().length;

            clearLastAltAreaHoverColor();
        })
        .on('end', () => {
            altHighlightedGraphics.interactive = true;
            altCanvas.node().__zoom = new d3.ZoomTransform(1, altX, altY);
        })
        .on('zoom', event => {
            altHighlightedGraphics.interactive = false;
            altHighlightedGraphics.clear();
            tooltip.style('display', 'none');
            
            altX = Math.max(altCanvasBox.width - altBandTime4Zoom * altDomaTime4Zoom, Math.min(event.transform.x, 0));
            altY = Math.max(altCanvasBox.height - altBandGeo4Zoom * altDomaGeo4Zoom, Math.min(event.transform.y, 0));
            const transX = altX - altLastX;
            const transY = altY - altLastY;
            altLastX = altX;
            altLastY = altY;
            
            updateAltGraphics();
            
            if (!altLoopBlock) {
                altLoopBlock = true;
                altGeoLine.call(altGeoZoom.translateBy, 0, transY / altGeoK);
                altTimeLineContainer.call(altTimeZoom.translateBy, transX / altTimeK, 0);
                altLoopBlock = false;

                if (!isODAltSync) {
                    isODAltSync = true;
                    odCanvas.call(odZoom.translateBy, transX, 0);   // Sync canvas with OD Data
                    isODAltSync = false;
                }

            }
        });
}

/**********************************************************************************************************************/
/* Geographical and time metrics creation, update and display */

/* Changes the DOM timeLine if needed and moves it */
function changeAltTimeScaleBand() {
    const fixedAltTimeK = altTimeK.toFixed(fractionDigits);
    let zoomedLine = altTimeDOMZoomedLines[fixedAltTimeK];
    if (!zoomedLine) {
        altTimeScaleBand = createScaleBand(timeValues, altCanvasBox.width * altTimeK);
        zoomedLine = storeAltTimeScaleBand(fixedAltTimeK, altTimeScaleBand);
    }
    altTimeScaleBand = zoomedLine.scaleBand;
    return zoomedLine;
}

/* Changes the DOM geoLines if needed and moves it */
function changeAltGeoScaleBand() {
    const fixedAltGeoK = altGeoK.toFixed(fractionDigits);
    let zoomedLines = altGeoDOMZoomedLines[fixedAltGeoK];
    if (!zoomedLines) {
        altGeoScaleBand = createScaleBand(altIdArray, altCanvasBox.height * altGeoK);
        zoomedLines = storeAltGeoScaleBand(fixedAltGeoK, altGeoScaleBand);
    }
    altGeoScaleBand = zoomedLines.scaleBand;
    return zoomedLines;
}

let altTimeDOMZoomedLines = {};
let altGeoDOMZoomedLines = {};

/* Stores the computed DOM timeLine and d3 scaleBand according to zoom level */
function storeAltTimeScaleBand(scale, scaleBand) {
    const reducedDomain = getReducedDomain(scaleBand, spaceScaleTime);
    altTimeDOMZoomedLines[scale] = createAltDOMTimeLine(scaleBand, reducedDomain);
    altTimeDOMZoomedLines[scale].scaleBand = scaleBand;
    return altTimeDOMZoomedLines[scale];
}

/* Stores the computed DOM geoLines and d3 scaleBand according to zoom level */
function storeAltGeoScaleBand(scale, scaleBand) {
    const reducedDomain = getReducedDomain(scaleBand, spaceScaleGeo);
    altGeoDOMZoomedLines[scale] = createAltDOMGeoLine(scaleBand, reducedDomain);
    altGeoDOMZoomedLines[scale].scaleBand = scaleBand;
    return altGeoDOMZoomedLines[scale];
}

let altTimeLine;

/* Displays the Alt time metric */
function displayAltTimeLine(onlyTranslation) {
    if (!onlyTranslation) {
        const altTimeDOMZoomedLine = changeAltTimeScaleBand();
        altTimeLineContainer.node().innerHTML = '';
        altTimeLineContainer.node().appendChild(altTimeDOMZoomedLine.time);
        altTimeLine = d3.select('#altTimeDOMZoomedLine');
    }
    altTimeLine.style('left', Math.floor(altX) + 'px');
}

let geoGraphics;

/* Displays the Alt geographical metric */
function displayAltGeoLine(onlyTranslation) {
    if (!onlyTranslation) {
        const geoDOMZoomedLines = changeAltGeoScaleBand();
        if (geoStage.children.length) geoStage.removeChildAt(0);
        geoGraphics = geoDOMZoomedLines.geo;
        geoStage.addChild(geoGraphics);
    }
    geoGraphics.position.y = Math.floor(altY);
}

/* Creates the computed geoLine DOM element */
function createAltDOMGeoLine(scaleBand, reducedDomain) {
    const offset = (scaleBand.bandwidth() - dataFontSize) / 2;
    let lastTop;

    const geoGraphics = new PIXI.Container();

    for (let geoText of reducedDomain) {
        const top = scaleBand(geoText) + offset;
        const obj = altDataObject.data[geoText];

        const originText = new PIXI.BitmapText(obj.geo, { fontName: 'helvetica' });
        originText.roundPixels = true;
        originText.anchor.set(1, 0);
        originText.position.x = Math.floor(altGeoCanvas.node().getBoundingClientRect().width - 5);
        originText.position.y = Math.floor(top);
        geoGraphics.addChild(originText);

        if (lastTop && altGeoScaleBand.domain().length !== reducedDomain.length) {    // Add the three dots
            const midTop = (top + lastTop) / 2;

            const originDots = new PIXI.BitmapText('···', { fontName: 'helvetica' });
            originDots.roundPixels = true;
            originDots.anchor.set(1, 0);
            originDots.position.x = Math.floor(altGeoCanvas.node().getBoundingClientRect().width - 5);
            originDots.position.y = Math.floor(midTop);
            geoGraphics.addChild(originDots);

        }
        lastTop = top;
    }
    return {geo: geoGraphics};
}

/* Creates the computed timeLine DOM element */
function createAltDOMTimeLine(scaleBand, reducedDomain) {
    const offset = scaleBand.bandwidth()/2 - dataFontSize;
    let lastLeft;

    const timeDiv = document.createElement('div');
    timeDiv.setAttribute('id', 'altTimeDOMZoomedLine');

    for (let timeText of reducedDomain) {
        const left = offset + scaleBand(timeText);
        const timingText = document.createElement('text');
        timingText.className = 'altTimeText';
        timingText.innerText = timeText;
        timingText.style.left = left + 'px';
        timingText.style['font-size'] = dataFontSize + 'px';
        timeDiv.appendChild(timingText);

        if (lastLeft && altTimeScaleBand.domain().length !== reducedDomain.length) {
            const midLeft = (left + lastLeft) / 2 + PIXI.TextMetrics.measureText(timeText, PIXI_STYLE).width/2 * Math.cos(Math.PI/4);
            const timingText = document.createElement('text');
            timingText.className = 'altTimeText';
            timingText.innerText = '···';
            timingText.style.left = midLeft + 'px';
            timingText.style['font-size'] = dataFontSize + 'px';
            timeDiv.appendChild(timingText);
        }

        lastLeft = left;
    }
    return {time: timeDiv};
}

/**********************************************************************************************************************/

let isAltLocalColorScale = true;

/* Handles the colorScale change (local/global) */
d3.select('#altLegendCheckbox').on('click', function () {
    const isClicked = !d3.select(this).classed('clicked');
    isAltLocalColorScale = isClicked;
    d3.select(this).classed('clicked', isClicked);
    drawAltData();
    altLegendCheckboxHandler();
});

/* Function called when legend content is static */
function altLegendCheckboxHandler() {
    if (isAltLocalColorScale) {
        hideAltLegendContent();
    } else {
        altLegendArea.html('');
        if (isFinite(altDataObject.globalData[typeAltOptionValue].minValue)) {
            displayLegendStats(altDataObject.globalData[typeAltOptionValue], false);
        } else {
            hideAltLegendContent();
        }
    }
}

/**********************************************************************************************************************/

/* Filters Alt data according to area selection */
function selectAltData() {
    const newAltDataObject = _.cloneDeep(altData[dataSetValue]);
    for (const id in newAltDataObject.data) {
        if (sideElts.left.selectedAreas[0] !== 'All' && !sideElts.left.selectedAreas.includes(newAltDataObject.data[id].geoCode)) {
            delete newAltDataObject.data[id];
        }
    }
    altDataObject = newAltDataObject;
    altIdArray = Object.keys(newAltDataObject.data);
    altDataArray = Object.values(newAltDataObject.data);
}

/**********************************************************************************************************************/
/* Functions for Alt data options */

/* Adds handlers for Alt data options */
function addAltSettingsButtonHandlers() {
    d3.select('#diffAltDisplayOption').on('click', function () {
        const isClicked = !d3.select(this).classed('clicked');
        d3.select(this).classed('clicked', isClicked);
        typeAltOptionValue = isClicked ? 'difference' : 'original';
        drawAltData();
        altLegendCheckboxHandler();
    });
    d3.select('#geoAltGroupOption').on('click', function () {
        const isClicked = !d3.select(this).classed('clicked');
        d3.select(this).classed('clicked', isClicked);
        isGroupByGeo = !isGroupByGeo;
        isGroupByGeo ? applyAltGrouping() : selectAltData();
        applyAltSorting();
        updateGlobalData(altDataObject, false, altColorInterpolators[dataSetValue]);
        redrawAltData(true);
    });
    d3.selectAll('.altSortOption').on('click', function () {
        initAltSorting(d3.select(this));
        redrawAltData(false);
    });
    datasetSelect.on('change', function() {
        altComparedGraphics.clear();
        altClickedGraphics.clear();
        clickedAltDataLine = undefined;
        altHighlightedComparedGraphics.interactive = false;
        altHighlightedComparedGraphics.buttonMode = false;
        d3.select('#comparedAltCanvas').style('opacity', 0);
        dataSetValue = d3.select(this).property('value');
        updateAltData();
    });
}

function applyAltGrouping() {
    if (!altDataArray.length) return;
    
    const newOriginalDataObject = Object.fromEntries([...altDataObject.dataColumnNames, 'total'].map(c => [c, Object.fromEntries(timeValues.map(t => [t, []]))]));
    const newAltDataObject = {
        data: {
            'MULTI': {
                geo: 'Multiple',
                geoCode: [],
                original: {
                    data: newOriginalDataObject,
                    minValue: Infinity,
                    maxValue: -Infinity,
                    avgValue: 0
                },
                difference: {
                    data: _.cloneDeep(newOriginalDataObject),
                    minValue: Infinity,
                    maxValue: -Infinity,
                    avgValue: 0
                }
            }
        },
        globalData: {
            original: {},
            difference: {}
        },
        dataColumnNames: altDataObject.dataColumnNames
    };

    const id = 'MULTI';
    let newID = '';
    for (const dataLine of altDataArray) {
        newID += dataLine.geoCode;
        newAltDataObject.data[id].geoCode.push(dataLine.geoCode);
        for (const dataColumnType in dataLine.original.data) {
            for (const time in dataLine.original.data[dataColumnType]) {
                const columnVal = dataLine.original.data[dataColumnType][time];
                newAltDataObject.data[id].original.data[dataColumnType][time].push(columnVal);
                newAltDataObject.data[id].original.data.total[time].push(columnVal);
            }
        }
    }

    const original = newAltDataObject.data[id].original;
    const originalData = original.data;
    for (const dataColumnType in original.data) {
        for (const time in originalData[dataColumnType]) {
            const dateArray = originalData[dataColumnType][time];
            if (_.isEmpty(dateArray)) delete originalData[dataColumnType][time];
            else originalData[dataColumnType][time] = isAltMeanChecked[dataSetValue] ? d3.mean(dateArray) : d3.sum(dateArray);
        }
    }
    const objectValues = Object.values(original.data.total);
    const extent = d3.extent(objectValues);
    original.minValue = extent[0];
    original.maxValue = extent[1];
    original.avgValue = d3.mean(objectValues);
    original.colorScale = d3.scaleSequential().domain([extent[0], extent[1]]).interpolator(altColorInterpolators[dataSetValue]);

    const difference = newAltDataObject.data[id].difference;
    //for (const dataColumnType in originalData) {
        //for (const date in originalData[dataColumnType]) {
    for (const dataColumnType in difference.data) {             //TODO flowstratesplus
        for (const date in difference.data[dataColumnType]) {   //TODO flowstratesplus
            const diff = originalData[dataColumnType][date] - originalData[dataColumnType]?.[parseInt(date) - 1];
            if (!isNaN(diff)) {
                difference.data[dataColumnType][date] = diff;
                if (dataColumnType === 'total') {
                    difference.minValue = Math.min(difference.minValue, diff);
                    difference.maxValue = Math.max(difference.maxValue, diff);
                    difference.avgValue = difference.avgValue + diff;
                }
            } else {
                delete difference.data[dataColumnType][date];   //TODO flowstratesplus
            }
        }
    }

    difference.avgValue = difference.avgValue / Object.keys(difference.data.total).length;
    const negColorScale = d3.scaleSequential().domain([0, Math.min(0, difference.minValue)]).interpolator(differenceColorInterpolators[0]);
    const posColorScale = d3.scaleSequential().domain([0, Math.max(0, difference.maxValue)]).interpolator(differenceColorInterpolators[1]);
    difference.colorScale = [negColorScale, posColorScale];

    newAltDataObject.data[id].id = newID;
    newAltDataObject.data[newID] = newAltDataObject.data[id];
    delete newAltDataObject.data[id];

    altIdArray = Object.keys(newAltDataObject.data);
    altDataArray = Object.values(newAltDataObject.data);
    altDataObject = newAltDataObject;
}

/* Initializes sorting of Alt Data */
function initAltSorting(sortOption) {
    const isClicked = resetButtonStyles('sortAltOptionsContainer', sortOption);
    sortAltOptionValue = (isClicked) ? sortOption.attr('id').substr(0,3) : 'none';
    applyAltSorting();
}

/* Applies sorting function to Alt data */
function applyAltSorting() {
    altIdArray = Object.keys(altDataObject.data);
    switch (sortAltOptionValue) {
        case 'min':
            altIdArray = altIdArray.sort((x,y) => {
                return altDataObject.data[x][typeAltOptionValue].minValue - altDataObject.data[y][typeAltOptionValue].minValue;
            });
            break;
        case 'max':
            altIdArray = altIdArray.sort((x,y) => {
                return altDataObject.data[y][typeAltOptionValue].maxValue - altDataObject.data[x][typeAltOptionValue].maxValue;
            });
            break;
        case 'avg':
            altIdArray = altIdArray.sort((x,y) => {
                return altDataObject.data[x][typeAltOptionValue].avgValue - altDataObject.data[y][typeAltOptionValue].avgValue;
            });
            break;
        case 'geo':
            altIdArray = altIdArray.sort((x,y) => {
                const xId = altDataObject.data[x].geo;
                const yId = altDataObject.data[y].geo;
                return xId.localeCompare(yId);
            });
    }
}

/**********************************************************************************************************************/
/* Functions for Alt legend */

function displayAltLegendContent(data, hoverOnCompared) {
    altLegendArea.html(data.geo);
    if (isAltLocalColorScale || hoverOnCompared) displayLegendStats(hoverOnCompared ? data : data[typeAltOptionValue], false);
}

function hideAltLegendContent() {
    altLegendArea.html('');
    for (let i = 0; i < 5; i++) {
        d3.select('#altStatColor' + i).style('background-color', null);
        d3.select('#altStatText' + i).html('');
    }
}