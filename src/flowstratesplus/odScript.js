let odZoom;
let odGeoZoom;
let odTimeZoom;

let odGeoScaleBand;
let odTimeScaleBand;
let odInitialGeoScaleBand;
let odInitialTimeScaleBand;

const odDataContainer = d3.select('#odDataContainer');
const odGeoContainer = d3.select('#odGeoContainer');
const odTimeContainer = d3.select('#odTimeContainer');
const odTimeLineContainer = d3.select('#odTimeLineContainer');

let odCanvasBox;
const odCanvas = d3.select('#odCanvas');
const originCanvas = d3.select('#originCanvas');
const destinationCanvas = d3.select('#destinationCanvas');

const odGeoLine = d3.select('.odGeoLine');
const odGeoLines = d3.selectAll('.odGeoLine');

const odLeftTimeHider = d3.select('#odLeftTimeHider');
const odRightTimeHider = d3.select('#odRightTimeHider');

const odLegendArea = d3.select('#odLegendArea');

let odIdArray;
let odDataArray;

/**********************************************************************************************************************/
/* Applies different styles (heights and widths) according to OD data */
function applyODStyles(maxTimeLength, maxGeoLength) {
    const timeHeight = Math.ceil(maxTimeLength) + timeHeightMargin;
    const geoWidth = Math.ceil(maxGeoLength);
    //const geoHeight = Math.ceil(odDataContainer.node().getBoundingClientRect().height - timeHeight);  //resize
    const geoHeight = Math.ceil(document.body.clientHeight * datasetGraphicRatio - timeHeight);

    odGeoContainer
        .style('height', geoHeight + 'px')
        .attr('height', geoHeight);
    odGeoLines
        .style('width', geoWidth + 'px')
        .style('height', geoHeight + 'px')
        .attr('width', geoWidth)
        .attr('height', geoHeight);

    odLeftTimeHider.style('width', geoWidth + 'px');
    odRightTimeHider.style('width', geoWidth + 'px');
    odTimeContainer.style('height', timeHeight + 'px');

    //const odCanvasWidth = odDataContainer.node().getBoundingClientRect().width - 2 * geoWidth;    //resize
    const odCanvasWidth = document.body.clientWidth * midPaneWidthRatio - 2 * geoWidth;

    odTimeLineContainer.style('width', odCanvasWidth + 'px');
    odCanvas
        .style('height', geoHeight + 'px')
        .style('width', odCanvasWidth + 'px')
        .attr('height', geoHeight)
        .attr('width', odCanvasWidth);

    //odCanvasBox = odCanvas.node().getBoundingClientRect();    //resize
    odCanvasBox = {};
    odCanvasBox.top = 54/100 * document.body.clientHeight + timeHeight;
    odCanvasBox.left = document.body.clientWidth / 4 + geoWidth;
    odCanvasBox.height = Math.ceil(odCanvas.attr('height'));
    odCanvasBox.width = Math.ceil(odCanvas.attr('width'));
    odCanvasBox.right = odCanvasBox.left + odCanvasBox.width;
    odCanvasBox.bottom = odCanvasBox.top + odCanvasBox.height;
}

/* Adds Origin-destination(OD) Data Map */
function addODMap() {
    displayODTimeLine(false);
    displayODGeoLine(false);

    odInitialTimeScaleBand = odTimeScaleBand;
    odInitialGeoScaleBand = odGeoScaleBand;

    createOriginGraphics();
    createDestinationGraphics();
    createODGraphics();

    drawODData();

    odDataContainer.style('opacity', 1);

    odZoom = createODZoom();
    odCanvas.call(odZoom).on('wheel.zoom', null);
    odGeoZoom = createODGeoZoom();
    odGeoLines.call(odGeoZoom).on('mousedown.zoom', null);
    odTimeZoom = createODTimeZoom();
    odTimeLineContainer.call(odTimeZoom).on('mousedown.zoom', null);
}

/**********************************************************************************************************************/
/* OD PIXI Graphics creation procedure */

const odGraphics = new PIXI.Graphics();
const odHighlightedGraphics = new PIXI.Graphics();
const odClickedGraphics = new PIXI.Graphics();
const originStage = new PIXI.Container();
const destinationStage = new PIXI.Container();

let odRenderer; //resize
let odOriginRenderer;
let odDestinationRenderer;

/* Creates origin PIXI graphics (origin text for OD data) */
function createOriginGraphics() {
    const rendererOptions = {
        width: originCanvas.node().getBoundingClientRect().width,
        height: originCanvas.node().getBoundingClientRect().height,
        backgroundColor: '0xffffff',
        antialias: true,
        view: originCanvas.node()
    };
    //const renderer = PIXI.autoDetectRenderer(rendererOptions);    //resize
    odOriginRenderer = PIXI.autoDetectRenderer(rendererOptions);
    animate();
    function animate() {
        //renderer.render(originStage);    //resize
        odOriginRenderer.render(originStage);
        requestAnimationFrame(animate);
    }
}

/* Creates destination PIXI graphics (destination text for OD data) */
function createDestinationGraphics() {
    const rendererOptions = {
        width: destinationCanvas.node().getBoundingClientRect().width,
        height: destinationCanvas.node().getBoundingClientRect().height,
        backgroundColor: '0xffffff',
        antialias: true,
        view: destinationCanvas.node()
    };
    //const renderer = PIXI.autoDetectRenderer(rendererOptions);       //resize
    odDestinationRenderer = PIXI.autoDetectRenderer(rendererOptions);
    animate();
    function animate() {
        //renderer.render(destinationStage);   //resize
        odDestinationRenderer.render(destinationStage);
        requestAnimationFrame(animate);
    }
}

/* Creates OD Pixi graphics */
function createODGraphics() {
    const rendererOptions = {
        width: odCanvasBox.width,
        height: odCanvasBox.height,
        backgroundColor: dataBackgroundColor,
        antialias: true,
        view: odCanvas.node()
    };
    //const renderer = PIXI.autoDetectRenderer(rendererOptions);    //resize
    odRenderer = PIXI.autoDetectRenderer(rendererOptions);
    const stage = new PIXI.Container();

    animate();
    function animate() {
        //renderer.render(stage);
        odRenderer.render(stage);
        requestAnimationFrame(animate);
    }

    //createODTooltipInteraction(renderer); //resize
    createODTooltipInteraction(odRenderer);

    stage.addChild(odGraphics);
    stage.addChild(odHighlightedGraphics);
    stage.addChild(odClickedGraphics);
}

/**********************************************************************************************************************/
/* OD Graphics update procedure */

/* Updates OD Data and then fires drawing method */
function updateODData() {
    selectODData();
    if (isGroupByOrigin) applyODGrouping('origin');
    if (isGroupByDestination) applyODGrouping('destination');
    applyODSorting();
    updateGlobalData(odDataObject, true, odColorInterpolator);
    redrawODData(true);
}

/* Redraws OD Data with different geoScale/zoom level */
function redrawODData(resetGeoZoom) {
    odGeoDOMZoomedLines = [];
    displayODGeoLine(false);
    odInitialGeoScaleBand = createScaleBand(odIdArray, odCanvasBox.height);
    if (resetGeoZoom) {
        odGeoLine.call(odGeoZoom.transform, d3.zoomIdentity);
        odGeoZoom.scaleExtent([1, Math.ceil(odCanvas.attr('height')/odGeoScaleBand.bandwidth())])
    }
    drawODData();
}

/* Draws OD Data on PIXI graphic */
function drawODData() {
    odGraphics.clear();
    for (const oddata of odDataArray) {
        for (const time in oddata[typeODOptionValue].data.total) {
            const data = oddata[typeODOptionValue].data.total[time];
            const colorScale = getODColorScale(oddata, data);
            odGraphics.beginFill('0x' + d3.color(colorScale(data)).formatHex().substr(1));
            odGraphics.drawRect(odInitialTimeScaleBand(time), odInitialGeoScaleBand(oddata.id), odInitialTimeScaleBand.bandwidth(), odInitialGeoScaleBand.bandwidth());
            odGraphics.endFill();
        }
    }
    if (isLineDisplayed) changeODLinesDisplay();
    if (clickedODDataLine) updateODClickedGraphics();
}

/* Updates OD PIXI graphics */
function updateODGraphics() {
    odGraphics.position.x = odX;
    odGraphics.position.y = odY;
    odGraphics.scale.x = odTimeK;
    odGraphics.scale.y = odGeoK;
    odHighlightedGraphics.position.x = odX;
    odHighlightedGraphics.position.y = odY;
    odHighlightedGraphics.hitArea = new PIXI.Rectangle(Math.abs(odX), Math.abs(odY), odCanvasBox.width, odCanvasBox.height);
    odClickedGraphics.position.x = odX;
    odClickedGraphics.position.y = odY;
    if (clickedODDataLine) updateODClickedGraphics();
}

/* Updates OD clicked black rectangle */
function updateODClickedGraphics() {
    odClickedGraphics.clear();
    const y = odGeoScaleBand(clickedODDataLine.id);
    if (_.isNumber(y)) {
        odClickedGraphics.beginFill(0xFFFFFF, 0.0);
        odClickedGraphics.lineStyle(rectClickedLineWidth, rectClickedLineColor);
        odClickedGraphics.drawRect(0, y, odCanvasBox.width * odTimeK, odGeoScaleBand.bandwidth());
        odClickedGraphics.endFill();
    }
}

/**********************************************************************************************************************/
/* OD data information (tooltip) creation */

function createODTooltipInteraction(renderer) {
    odHighlightedGraphics.interactive = true;
    odHighlightedGraphics.buttonMode = true;
    odHighlightedGraphics.hitArea = new PIXI.Rectangle(0, 0, odCanvasBox.width, odCanvasBox.height);
    const interactionManager = renderer.plugins['interaction'];
    odHighlightedGraphics
        .on('mousemove', (event) => {
            if (interactionManager.hitTest(event.data.global, odHighlightedGraphics)) {
                const pos = event.data.getLocalPosition(odHighlightedGraphics);
                const x = pos.x;
                const y = pos.y;

                const geoScaleBandwidth = odGeoScaleBand.bandwidth();
                const timeScaleBandwidth = odTimeScaleBand.bandwidth();

                odHighlightedGraphics.clear();
                odHighlightedGraphics.beginFill(0xFFFFFF, 0.0);
                odHighlightedGraphics.lineStyle(1, 0x000000);
                odHighlightedGraphics.drawRect(x - (x % timeScaleBandwidth), y - (y % geoScaleBandwidth), timeScaleBandwidth, geoScaleBandwidth);
                odHighlightedGraphics.endFill();

                const xIdentifier = odTimeScaleBand.domain()[Math.floor(x / timeScaleBandwidth)];
                const yIdentifier = odGeoScaleBand.domain()[Math.floor(y / geoScaleBandwidth)];
                const dataLine = odDataObject.data[yIdentifier];
                const data = dataLine[typeODOptionValue].data.total[xIdentifier];
                let tooltipText = `${dataLine.origin} -> ${dataLine.destination}<br>`;
                const roundedData = tooltipRoundData(data);
                tooltipText += `${xIdentifier} : ${roundedData || '-'}<br>`;
                if (!isNaN(roundedData) && odDataObject.dataColumnNames.length > 1) {
                    for (const columnData of odDataObject.dataColumnNames) {
                        tooltipText += `${columnData} : ${tooltipRoundData(dataLine[typeODOptionValue].data[columnData]?.[xIdentifier]) || '-'}<br>`;
                    }
                }
                tooltip.html(tooltipText);

                const globalPos = odHighlightedGraphics.toGlobal(new PIXI.Point(x - (x % timeScaleBandwidth) + timeScaleBandwidth, y - (y % geoScaleBandwidth)));
                const gx = globalPos.x;
                const gy = globalPos.y;
                tooltip.style('bottom', document.body.clientHeight - odCanvasBox.top - gy - ((gy < 0) ? geoScaleBandwidth : 0) + 'px')
                        .style('left', odCanvasBox.left + gx - ((gx > odCanvasBox.width) ? timeScaleBandwidth : 0) + 'px')
                        .style('display', 'block');

                colorODAreaOnHover(dataLine, data, xIdentifier, false);
                displayODLegendContent(dataLine, false);
            }
        })
        .on('mouseout', () => {
            odHighlightedGraphics.clear();
            tooltip.style('display', 'none');
            odLegendCheckboxHandler();
            clearLastODAreaHoverColor();
            lastODLeftAreaPath = undefined;
            lastODRightAreaPath = undefined;
            lastODLeftAreaPathID = undefined;
            lastODRightAreaPathID = undefined;
        })
        .on('click', (event) => {
            const pos = event.data.getLocalPosition(odHighlightedGraphics);

            const geoScaleBandwidth = odGeoScaleBand.bandwidth();
            const timeScaleBandwidth = odTimeScaleBand.bandwidth();

            const xIdentifier = odTimeScaleBand.domain()[Math.floor(pos.x / timeScaleBandwidth)];
            const yIdentifier = odGeoScaleBand.domain()[Math.floor(pos.y / geoScaleBandwidth)];
            const dataLine = odDataObject.data[yIdentifier];
            const data = dataLine[typeODOptionValue].data.total[xIdentifier];

            const colorScale = getODColorScale(dataLine, data);

            showAreaOnMap(dataLine, colorScale(data), 'left');
            showAreaOnMap(dataLine, colorScale(data), 'right');

            const tmpClickedODDataLine = _.cloneDeep(dataLine);
            clickedODDataLine = {...tmpClickedODDataLine, ..._.cloneDeep(dataLine[typeODOptionValue])};
            delete clickedODDataLine.original;
            delete clickedODDataLine.difference;
            drawODComparedData();

            updateODClickedGraphics();

            tooltip.style('display', 'none');
        });
}

/**********************************************************************************************************************/
/* Area coloration functions */

let lastODLeftAreaPath;
let lastODRightAreaPath;
let lastODLeftAreaPathID;
let lastODRightAreaPathID;
let lastODTime;
let odTimeout;

/* Colors areas on OD Data hover */
function colorODAreaOnHover(dataLine, data, newTime, hoverOnCompared) {
    const newODLeftAreaPath = [];
    const newODRightAreaPath = [];
    let newODLeftAreaPathID = '';
    let newODRightAreaPathID = '';
    if (Array.isArray(dataLine.originCode)) {
        for (const oneOriginCode of dataLine.originCode) {
            newODLeftAreaPath.push(d3.select('#leftAreaPath_' + removeLastDigits(oneOriginCode)));
            newODLeftAreaPathID += oneOriginCode;
        }
    } else {
        newODLeftAreaPath.push(d3.select('#leftAreaPath_' + removeLastDigits(dataLine.originCode)));
        newODLeftAreaPathID = dataLine.originCode;
    }
    if (Array.isArray(dataLine.destinationCode)) {
        for (const oneDestinationCode of dataLine.destinationCode) {
            newODRightAreaPath.push(d3.select('#rightAreaPath_' + removeLastDigits(oneDestinationCode)));
            newODRightAreaPathID += oneDestinationCode;
        }
    } else {
        newODRightAreaPath.push(d3.select('#rightAreaPath_' + removeLastDigits(dataLine.destinationCode)));
        newODRightAreaPathID = dataLine.destinationCode;
    }

    if (lastODLeftAreaPathID !== newODLeftAreaPathID || lastODRightAreaPathID !== newODRightAreaPathID || lastODTime !== newTime) {
        clearLastODAreaHoverColor();
        odTimeout = setTimeout(() => {
            const colorScale = hoverOnCompared ? getDiffOriColorScale(dataLine.colorScale, data) : getODColorScale(dataLine, data);
            if (colorScale(data)) {
                for (const areaPath of newODLeftAreaPath) {
                    areaPath.style('fill', colorScale(data));
                }
                for (const areaPath of newODRightAreaPath) {
                    areaPath.style('fill', colorScale(data));
                }
            }
        }, areaHoverColorTimeout);
        lastODLeftAreaPath = newODLeftAreaPath;
        lastODRightAreaPath = newODRightAreaPath;
        lastODLeftAreaPathID = newODLeftAreaPathID;
        lastODRightAreaPathID = newODRightAreaPathID;
        lastODTime = newTime;
    }
}

/* Removes colors from last hovered areas */
function clearLastODAreaHoverColor() {
    if (odTimeout) clearTimeout(odTimeout);
    if (lastODLeftAreaPath) {
        for (const areaPath of lastODLeftAreaPath) {
            const pathOriFillCondition = sideElts.left.selectedAreas[0] === 'All' || !sideElts.left.selectedAreas.includes(areaPath.attr('id').split('_')[1]);
            areaPath.style('fill', pathOriFillCondition ? pathOriFillColor : pathSelFillColor);
        }
    }
    if (lastODRightAreaPath) {
        for (const areaPath of lastODRightAreaPath) {
            const pathOriFillCondition = sideElts.right.selectedAreas[0] === 'All' || !sideElts.right.selectedAreas.includes(areaPath.attr('id').split('_')[1]);
            areaPath.style('fill', pathOriFillCondition ? pathOriFillColor : pathSelFillColor);
        }
    }
}

/* Gets colorScale according to data, typeODOptionValue and local/global colorScale */
function getODColorScale(dataLine, data) {
    const colorScale = isODLocalColorScale ? dataLine[typeODOptionValue].colorScale : odDataObject.globalData[typeODOptionValue].colorScale;
    return getDiffOriColorScale(colorScale, data);
}

/**********************************************************************************************************************/
/* OD Data and metrics interaction creation */

let odLoopBlock = false;

let odX = 0;
let odY = 0;
let odLastX = 0;
let odLastY = 0;
let odGeoLastY = 0;
let odTimeLastX = 0;
let odTimeK = 1;
let odGeoK = 1;

/* Creates zoom interaction for OD time metric */
function createODTimeZoom() {
    return d3.zoom()
        .scaleExtent([1, Math.ceil(odCanvas.attr('width')/odTimeScaleBand.bandwidth())])
        .translateExtent([[0, 0], [odCanvas.attr('width'), odTimeContainer.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('zoom', (event) => {
            odTimeK = event.transform.k;
            odX = event.transform.x;
            const transX = odX - odTimeLastX;
            odTimeLastX = odX;

            displayODTimeLine(odLoopBlock);

            if (!odLoopBlock) {
                odLoopBlock = true;
                odCanvas.call(odZoom.translateBy, transX, 0);
                odLoopBlock = false;

                if (!isODAltSync) {
                    isODAltSync = true;
                    altTimeLineContainer.call(altTimeZoom.transform, event.transform);  // Sync timeline with Alt Data
                    isODAltSync = false;
                }

            }
        });
}

/* Creates zoom interaction for OD geographical metric */
function createODGeoZoom() {
    return d3.zoom()
        .scaleExtent([1, Math.ceil(odCanvas.attr('height')/odGeoScaleBand.bandwidth())])
        .translateExtent([[0, 0],[odGeoLine.attr('width'), odGeoLine.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('zoom', (event) => {
            odGeoK = event.transform.k;
            odY = event.transform.y;
            const transY = odY - odGeoLastY;
            odGeoLastY = odY;

            displayODGeoLine(odLoopBlock);

            if (!odLoopBlock) {
                odLoopBlock = true;
                odCanvas.call(odZoom.translateBy, 0, transY);
                odLoopBlock = false;

                if (isLineDisplayed) changeODLinesDisplay();

            }
        })
        .on('end', (event) => {
            if (!odLoopBlock) {
                originCanvas.node().__zoom = new d3.ZoomTransform(odGeoK, event.transform.x, odY);      // Sync zoom between odGeoLines
                destinationCanvas.node().__zoom = new d3.ZoomTransform(odGeoK, event.transform.x, odY); // Sync zoom between odGeoLines
            }
        });
}

let odBandGeo4Zoom;
let odDomaGeo4Zoom;
let odBandTime4Zoom;
let odDomaTime4Zoom;

/* Creates zoom (drag) interaction for OD data */
function createODZoom() {
    return d3.zoom()
        .on('start', () => {
            odBandGeo4Zoom = odGeoScaleBand.bandwidth();
            odDomaGeo4Zoom = odGeoScaleBand.domain().length;
            odBandTime4Zoom = odTimeScaleBand.bandwidth();
            odDomaTime4Zoom = odTimeScaleBand.domain().length;

            clearLastODAreaHoverColor();
        })
        .on('end', () => {
            odHighlightedGraphics.interactive = true;
            odCanvas.node().__zoom = new d3.ZoomTransform(1, odX, odY);
        })
        .on('zoom', event => {
            odHighlightedGraphics.interactive = false;
            odHighlightedGraphics.clear();
            tooltip.style('display', 'none');

            odX = Math.max(odCanvasBox.width - odBandTime4Zoom * odDomaTime4Zoom, Math.min(event.transform.x, 0));
            odY = Math.max(odCanvasBox.height - odBandGeo4Zoom * odDomaGeo4Zoom, Math.min(event.transform.y, 0));
            const transX = odX - odLastX;
            const transY = odY - odLastY;
            odLastX = odX;
            odLastY = odY;

            updateODGraphics();

            if (!odLoopBlock) {
                odLoopBlock = true;
                odGeoLines.call(odGeoZoom.translateBy, 0, transY / odGeoK);
                odTimeLineContainer.call(odTimeZoom.translateBy, transX / odTimeK, 0);
                odLoopBlock = false;

                if (!isODAltSync) {
                    isODAltSync = true;
                    altCanvas.call(altZoom.translateBy, transX, 0);   // Sync canvas with alt Data
                    isODAltSync = false;
                }

                if (isLineDisplayed) changeODLinesDisplay();

            }
        });
}

/**********************************************************************************************************************/
/* Geographical and time metrics creation, update and display */

/* Changes the DOM timeLine if needed and moves it */
function changeODTimeScaleBand() {
    const fixedOdTimeK = odTimeK.toFixed(fractionDigits);
    let zoomedLine = odTimeDOMZoomedLines[fixedOdTimeK];
    if (!zoomedLine) {
        odTimeScaleBand = createScaleBand(timeValues, odCanvasBox.width * odTimeK);
        zoomedLine = storeODTimeScaleBand(fixedOdTimeK, odTimeScaleBand);
    }
    odTimeScaleBand = zoomedLine.scaleBand;
    return zoomedLine;
}

/* Changes the DOM geoLines if needed and moves it */
function changeODGeoScaleBand() {
    const fixedOdGeoK = odGeoK.toFixed(fractionDigits);
    let zoomedLines = odGeoDOMZoomedLines[fixedOdGeoK];
    if (!zoomedLines) {
        odGeoScaleBand = createScaleBand(odIdArray, odCanvasBox.height * odGeoK);
        zoomedLines = storeODGeoScaleBand(fixedOdGeoK, odGeoScaleBand);
    }
    odGeoScaleBand = zoomedLines.scaleBand;
    return zoomedLines;
}

let odTimeDOMZoomedLines = {};
let odGeoDOMZoomedLines = {};

/* Stores the computed DOM timeLine and d3 scaleBand according to zoom level */
function storeODTimeScaleBand(scale, scaleBand) {
    const reducedDomain = getReducedDomain(scaleBand, spaceScaleTime);
    odTimeDOMZoomedLines[scale] = createODDOMTimeLine(scaleBand, reducedDomain);
    odTimeDOMZoomedLines[scale].scaleBand = scaleBand;
    return odTimeDOMZoomedLines[scale];
}

/* Stores the computed DOM geoLines and d3 scaleBand according to zoom level */
function storeODGeoScaleBand(scale, scaleBand) {
    const reducedDomain = getReducedDomain(scaleBand, spaceScaleGeo);
    odGeoDOMZoomedLines[scale] = createODDOMGeoLine(scaleBand, reducedDomain);
    odGeoDOMZoomedLines[scale].scaleBand = scaleBand;
    return odGeoDOMZoomedLines[scale];
}

let odTimeLine;

/* Displays the OD time metric */
function displayODTimeLine(onlyTranslation) {
    if (!onlyTranslation) {
        const odTimeDOMZoomedLine = changeODTimeScaleBand();
        odTimeLineContainer.node().innerHTML = '';
        odTimeLineContainer.node().appendChild(odTimeDOMZoomedLine.time);
        odTimeLine = d3.select('#odTimeDOMZoomedLine');
    }
    odTimeLine.style('left', Math.floor(odX) + 'px');
}

let originGraphics;
let destinationGraphics;

/* Displays the OD geographical metric */
function displayODGeoLine(onlyTranslation) {
    if (!onlyTranslation) {
        const geoDOMZoomedLines = changeODGeoScaleBand();
        if (originStage.children.length) originStage.removeChildAt(0);
        if (destinationStage.children.length) destinationStage.removeChildAt(0);
        originGraphics = geoDOMZoomedLines.origin;
        destinationGraphics = geoDOMZoomedLines.destination;
        originStage.addChild(originGraphics);
        destinationStage.addChild(destinationGraphics);
    }
    originGraphics.position.y = Math.floor(odY);
    destinationGraphics.position.y = Math.floor(odY);
}

/* Creates the computed DOM geoLines */
function createODDOMGeoLine(scaleBand, reducedDomain) {
    const offset = (scaleBand.bandwidth() - dataFontSize) / 2;
    let lastTop;

    const originGraphics = new PIXI.Container();
    const destinationGraphics = new PIXI.Container();

    for (let geoText of reducedDomain) {
        const top = scaleBand(geoText) + offset;
        const obj = odDataObject.data[geoText];

        const originText = new PIXI.BitmapText(obj['origin'], { fontName: 'helvetica' });
        originText.roundPixels = true;
        originText.anchor.set(1, 0);
        originText.position.x = Math.floor(originCanvas.node().getBoundingClientRect().width - 5);
        originText.position.y = Math.floor(top);
        originGraphics.addChild(originText);

        const destinationText = new PIXI.BitmapText(obj['destination'], { fontName: 'helvetica' });
        destinationText.roundPixels = true;
        destinationText.position.x = 5;
        destinationText.position.y = Math.floor(top);
        destinationGraphics.addChild(destinationText);

        if (lastTop && odGeoScaleBand.domain().length !== reducedDomain.length) {    // Add the three dots
            const midTop = (top + lastTop) / 2;

            const originDots = new PIXI.BitmapText('···', { fontName: 'helvetica' });
            originDots.roundPixels = true;
            originDots.anchor.set(1, 0);
            originDots.position.x = Math.floor(originCanvas.node().getBoundingClientRect().width - 5);
            originDots.position.y = Math.floor(midTop);
            originGraphics.addChild(originDots);

            const destinationDots = new PIXI.BitmapText('···', { fontName: 'helvetica' });
            destinationDots.roundPixels = true;
            destinationDots.position.x = 5;
            destinationDots.position.y = Math.floor(midTop);
            destinationGraphics.addChild(destinationDots);

        }
        lastTop = top;
    }
    return {origin: originGraphics, destination: destinationGraphics};
}

/* Creates the computed DOM timeLine */
function createODDOMTimeLine(scaleBand, reducedDomain) {
    const offset = scaleBand.bandwidth()/2 - dataFontSize;
    let lastLeft;

    const timeDiv = document.createElement('div');
    timeDiv.setAttribute('id', 'odTimeDOMZoomedLine');

    for (let timeText of reducedDomain) {
        const left = offset + scaleBand(timeText);
        const timingText = document.createElement('text');
        timingText.className = 'odTimeText';
        timingText.innerText = timeText;
        timingText.style.left = left + 'px';
        timingText.style['font-size'] = dataFontSize + 'px';
        timeDiv.appendChild(timingText);

        if (lastLeft && odTimeScaleBand.domain().length !== reducedDomain.length) {
            const midLeft = (left + lastLeft) / 2 + PIXI.TextMetrics.measureText(timeText, PIXI_STYLE).width/2 * Math.cos(Math.PI/4);
            const timingText = document.createElement('text');
            timingText.className = 'odTimeText';
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
/* Functions for displayed lines on maps */

const { DeckGL, OrthographicView, LineLayer } = deck;
let leftDeck;
let rightDeck;
let areaSet;    // Array to specify line colors

/* Creates deck canvas for line display */
function createDeck() {
    leftDeck = new DeckGL({
        container: 'leftDeck',
        views: new OrthographicView(),
        initialViewState: {target: [document.body.clientWidth/4, document.body.clientHeight/2, 0]}
    });
    rightDeck = new DeckGL({
        container: 'rightDeck',
        views: new OrthographicView(),
        initialViewState: {target: [document.body.clientWidth * 3/4, document.body.clientHeight/2, 0]}
    });
    setLinesAreaSet();
}

/* Sets an array of unique identifiers to map each one to a different color */
function setLinesAreaSet() {
    areaSet = _.shuffle([...new Set(odDataArray.slice().map(e => e[odAreaLinesSetIdentifier]))]);
}

let targetCoordinates;
let sourceCoordinates;
let targetYCoordinate;
let sourceYCoordinate;

const throttledChangeODLeftLinesDisplay = _.throttle(changeODLeftLinesDisplay, 10);
const throttledChangeODRightLinesDisplay = _.throttle(changeODRightLinesDisplay, 10);

/* Updates lines display */
function changeODLinesDisplay(side) {
    switch (side) {
        case 'left':
            throttledChangeODLeftLinesDisplay();
            break;
        case 'right':
            throttledChangeODRightLinesDisplay();
            break;
        default:
            throttledChangeODLeftLinesDisplay();
            throttledChangeODRightLinesDisplay();
            break;
    }
}

/* Updates lines display on left map */
function changeODLeftLinesDisplay() {
    const leftLineLayer = new LineLayer({
        data: (isGroupByOrigin || isGroupByDestination) ? odDataGroupArray : odDataArray,
        getSourcePosition: d => {
            const boundingRect = d3.select('#leftAreaPoint_' + removeLastDigits(d.originCode))?.node()?.getBoundingClientRect();
            return (checkODLeftLineVisibility(d.id, boundingRect)) ? [(boundingRect?.left + boundingRect?.right) / 2, (boundingRect?.top + boundingRect?.bottom) / 2] : [0,0];
        },
        getTargetPosition: d => {
            const boundingRect = d3.select('#leftAreaPoint_' + removeLastDigits(d.originCode))?.node()?.getBoundingClientRect();
            return (checkODLeftLineVisibility(d.id, boundingRect)) ? [document.body.clientWidth / 4, targetYCoordinate] : [0,0];
        },
        getColor: getLineColor,
        visible: isLineDisplayed,
        updateTriggers: {
            getSourcePosition: [sourceCoordinates, targetYCoordinate],
            getTargetPosition: [sourceCoordinates, targetYCoordinate],
            getLineColor: [areaSetLength, odAreaLinesSetIdentifier]
        }
    });
    leftDeck.setProps({layers: [leftLineLayer]});
}

/* Updates lines display on right map */
function changeODRightLinesDisplay() {
    const rightLineLayer = new LineLayer({
        data: (isGroupByOrigin || isGroupByDestination) ? odDataGroupArray : odDataArray,
        getSourcePosition: d => {
            const boundingRect = d3.select('#rightAreaPoint_' + removeLastDigits(d.destinationCode))?.node()?.getBoundingClientRect();
            return (checkODRightLineVisibility(d.id, boundingRect)) ? [document.body.clientWidth * 3/4, sourceYCoordinate] : [0,0];
        },
        getTargetPosition: d => {
            const boundingRect = d3.select('#rightAreaPoint_' + removeLastDigits(d.destinationCode))?.node()?.getBoundingClientRect();
            return (checkODRightLineVisibility(d.id, boundingRect)) ? [(boundingRect?.left + boundingRect?.right) / 2, (boundingRect?.top + boundingRect?.bottom) / 2] : [0,0];
        },
        getColor: getLineColor,
        visible: isLineDisplayed,
        updateTriggers: {
            getSourcePosition: [targetCoordinates, sourceYCoordinate],
            getTargetPosition: [targetCoordinates, sourceYCoordinate],
            getLineColor: [areaSetLength, odAreaLinesSetIdentifier]
        }
    });
    rightDeck.setProps({layers: [rightLineLayer]});
}

let areaSetLength;

/* Gets line color according to data */
function getLineColor(d) {
    areaSetLength = areaSet.length;
    const color = d3.rgb(d3.scaleSequential()
        .domain([0, areaSetLength])
        .interpolator(d3.interpolateSinebow)(areaSet.indexOf(d[odAreaLinesSetIdentifier])));
    return [color.r, color.g, color.b, 125];
}

/* Checks if origin is visible on left map */
function checkODLeftLineVisibility(id, boundingRect) {
    sourceCoordinates = [(boundingRect?.left + boundingRect?.right) /2, (boundingRect?.top + boundingRect?.bottom) / 2];
    const [x, y] = sourceCoordinates;
    targetYCoordinate = odCanvasBox.top + odY + odGeoScaleBand(id) + odGeoScaleBand.bandwidth()/2;
    return !(x < 0 || x > document.body.clientWidth/4 ||
        y < leftsvg.node().getBoundingClientRect().top || y > document.body.clientHeight ||
        targetYCoordinate < odCanvasBox.top || targetYCoordinate > odCanvasBox.bottom);
}

/* Checks if destination is visible on right map */
function checkODRightLineVisibility(id, boundingRect) {
    targetCoordinates = [(boundingRect?.left + boundingRect?.right) /2, (boundingRect?.top + boundingRect?.bottom) / 2];
    const [x, y] = targetCoordinates;
    sourceYCoordinate = odCanvasBox.top + odY + odGeoScaleBand(id) + odGeoScaleBand.bandwidth()/2;
    return !(x < document.body.clientWidth * 3/4 || x > document.body.clientWidth ||
        y < rightsvg.node().getBoundingClientRect().top || y > document.body.clientHeight ||
        sourceYCoordinate < odCanvasBox.top || sourceYCoordinate > odCanvasBox.bottom);
}

/**********************************************************************************************************************/

let isODLocalColorScale = true;

/* Handles the colorScale change (local/global) */
d3.select('#odLegendCheckbox').on('click', function () {
    const isClicked = !d3.select(this).classed('clicked');
    isODLocalColorScale = isClicked;
    d3.select(this).classed('clicked', isClicked);
    drawODData();
    odLegendCheckboxHandler();
});

/* Function called when legend content is static */
function odLegendCheckboxHandler() {
    if (isODLocalColorScale) {
        hideODLegendContent();
    } else {
        odLegendArea.html('');
        displayLegendStats(odDataObject.globalData[typeODOptionValue], true);
    }
}

/**********************************************************************************************************************/

/* Filters OD data according to area selection */
function selectODData() {
    const newODDataObject = _.cloneDeep(odData);
    for (const id in newODDataObject.data) {
        if (sideElts.left.selectedAreas[0] !== 'All' && !sideElts.left.selectedAreas.includes(newODDataObject.data[id].originCode) ||
            sideElts.right.selectedAreas[0] !== 'All' && !sideElts.right.selectedAreas.includes(newODDataObject.data[id].destinationCode)) {
            delete newODDataObject.data[id];
        }
    }
    odDataObject = newODDataObject;
    odIdArray = Object.keys(newODDataObject.data);
    odDataArray = Object.values(newODDataObject.data);
}

/**********************************************************************************************************************/
/* Functions for OD data options */

/* Adds handlers for OD data options */
function addODSettingsButtonHandlers() {
    d3.select('#linesODDisplayOption').on('click', function () {
        const isClicked = !d3.select(this).classed('clicked');
        d3.select(this).classed('clicked', isClicked);
        isLineDisplayed = !isLineDisplayed;
        changeODLinesDisplay();
    });
    d3.select('#diffODDisplayOption').on('click', function () {
        const isClicked = !d3.select(this).classed('clicked');
        d3.select(this).classed('clicked', isClicked);
        typeODOptionValue = isClicked ? 'difference' : 'original';
        drawODData();
        odLegendCheckboxHandler();
    });
    d3.select('#originODGroupOption').on('click', function () {
        const isClicked = !d3.select(this).classed('clicked');
        d3.select(this).classed('clicked', isClicked);
        isGroupByOrigin = !isGroupByOrigin;
        if (isGroupByOrigin) {
            applyODGrouping('origin');
        } else {
            selectODData();
            if (isGroupByDestination) applyODGrouping('destination');
        }
        applyODSorting();
        updateGlobalData(odDataObject, true, odColorInterpolator);
        redrawODData(true);
    });
    d3.select('#destinationODGroupOption').on('click', function () {
        const isClicked = !d3.select(this).classed('clicked');
        d3.select(this).classed('clicked', isClicked);
        isGroupByDestination = !isGroupByDestination;
        if (isGroupByDestination) {
            applyODGrouping('destination');
        } else {
            selectODData();
            if (isGroupByOrigin) applyODGrouping('origin');
        }
        applyODSorting();
        updateGlobalData(odDataObject, true, odColorInterpolator);
        redrawODData(true);
    });
    d3.selectAll('.odSortOption').on('click', function () {
        initODSorting(d3.select(this));
        redrawODData(false);
    });
}

let odDataGroupArray;

function applyODGrouping(groupOption) {
    if (!odDataArray.length) return;
    
    const newODDataObject = {
        data: {},
        globalData: {
            original: {},
            difference: {}
        },
        dataColumnNames: odDataObject.dataColumnNames
    };

    let isArrayOriCode = Array.isArray(odDataArray[0].originCode);
    let isArrayDesCode = Array.isArray(odDataArray[0].destinationCode);
    
    for (const dataLine of odDataArray) {
        const newID = (groupOption === 'origin') ? `${isArrayOriCode ? 'MULTI' : dataLine.originCode}_MULTI` : `MULTI_${isArrayDesCode ? 'MULTI' : dataLine.destinationCode}`;
        if (!newODDataObject.data.hasOwnProperty(newID)) {
            const newOriginalDataObject = Object.fromEntries([...odDataObject.dataColumnNames, 'total'].map(c => [c, Object.fromEntries(timeValues.map(t => [t, []]))]));
            newODDataObject.data[newID] = {
                id: newID,
                originCode: (groupOption === 'origin') ? dataLine.originCode : [],
                destinationCode: (groupOption === 'origin') ? [] : dataLine.destinationCode,
                origin: (groupOption === 'origin') ? dataLine.origin : 'Multiple',
                destination: (groupOption === 'origin') ? 'Multiple' : dataLine.destination,
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
            };
        }
    }

    for (const dataLine of odDataArray) {
        const newID = (groupOption === 'origin') ? `${isArrayOriCode ? 'MULTI' : dataLine.originCode}_MULTI` : `MULTI_${isArrayDesCode ? 'MULTI' : dataLine.destinationCode}`;
        (groupOption === 'origin') ? newODDataObject.data[newID].destinationCode.push(dataLine.destinationCode) : newODDataObject.data[newID].originCode.push(dataLine.originCode);
        for (const dataColumnType in dataLine.original.data) {
            for (const time in dataLine.original.data[dataColumnType]) {
                newODDataObject.data[newID].original.data[dataColumnType][time].push(dataLine.original.data[dataColumnType][time]);
            }
        }
    }

    for (const id in newODDataObject.data) {
        const original = newODDataObject.data[id].original
        const originalData = original.data;
        for (const dataColumnType in originalData) {
            for (const time in originalData[dataColumnType]) {
                const dateArray = originalData[dataColumnType][time];
                if (_.isEmpty(dateArray)) delete originalData[dataColumnType][time];
                else originalData[dataColumnType][time] = (isODMeanChecked) ? d3.mean(dateArray) : d3.sum(dateArray);
            }
        }
        const objectValues = Object.values(newODDataObject.data[id].original.data.total);
        const extent = d3.extent(objectValues);
        original.minValue = extent[0];
        original.maxValue = extent[1];
        original.avgValue = d3.mean(objectValues);
        original.colorScale = d3.scaleSequential().domain([extent[0], extent[1]]).interpolator(odColorInterpolator);
        
        const difference = newODDataObject.data[id].difference;
        for (const dataColumnType in originalData) {
            difference.data[dataColumnType] = {};
            for (const date in originalData[dataColumnType]) {
                const diff = originalData[dataColumnType][date] - originalData[dataColumnType]?.[parseInt(date) - 1];
                if (!isNaN(diff)) {
                    difference.data[dataColumnType][date] = diff;
                    if (dataColumnType === 'total') {
                        difference.minValue = Math.min(difference.minValue, diff);
                        difference.maxValue = Math.max(difference.maxValue, diff);
                        difference.avgValue = difference.avgValue + diff;
                    }
                }
            }
        }
    }

    for (const id in newODDataObject.data) {
        newODDataObject.data[id].difference.avgValue = newODDataObject.data[id].difference.avgValue / Object.keys(newODDataObject.data[id].difference.data.total).length;
        const negColorScale = d3.scaleSequential()
            .domain([0, Math.min(0, newODDataObject.data[id].difference.minValue)])
            .interpolator(differenceColorInterpolators[0]);
        const posColorScale = d3.scaleSequential()
            .domain([0, Math.max(0, newODDataObject.data[id].difference.maxValue)])
            .interpolator(differenceColorInterpolators[1]);
        newODDataObject.data[id].difference.colorScale = [negColorScale, posColorScale];
    }

    isArrayOriCode = Array.isArray(Object.values(newODDataObject.data)[0].originCode);
    isArrayDesCode = Array.isArray(Object.values(newODDataObject.data)[0].destinationCode);
    const newODDataObjectWithLongID = {...newODDataObject, data: {}};
    for (const id in newODDataObject.data) {
        const dataLine = newODDataObject.data[id];
        let longID = dataLine.id;
        if (isArrayOriCode) longID = longID.replace('MULTI_', `${dataLine.originCode.sort().join('')}_`);
        if (isArrayDesCode) longID = longID.replace('_MULTI', `${dataLine.destinationCode.sort().join('')}`);
        dataLine.id = longID;
        newODDataObjectWithLongID.data[longID] = dataLine;
    }
    odIdArray = Object.keys(newODDataObjectWithLongID.data);
    odDataArray = Object.values(newODDataObjectWithLongID.data);
    odDataObject = newODDataObjectWithLongID;

    isArrayOriCode = Array.isArray(odDataArray[0].originCode);
    isArrayDesCode = Array.isArray(odDataArray[0].destinationCode);

    odDataGroupArray = [];  // Variable only used for lines display
    for (const dataLine of odDataArray) {
        if (isArrayDesCode) {
            const oneOriginCode = isArrayOriCode ? dataLine.originCode[0] : dataLine.originCode;
            for (const destinationCode of dataLine.destinationCode) {
                odDataGroupArray.push({
                    id: dataLine.id,
                    originCode: oneOriginCode,
                    destinationCode: destinationCode
                });
            }
        }
        if (isArrayOriCode) {
            const oneDestinationCode = isArrayDesCode ? dataLine.destinationCode[0] : dataLine.destinationCode;
            for (const originCode of dataLine.originCode) {
                odDataGroupArray.push({
                    id: dataLine.id,
                    originCode: originCode,
                    destinationCode: oneDestinationCode
                });
            }
        }
    }

    odAreaLinesSetIdentifier = 'id';
    setLinesAreaSet();
}



/* Initializes sorting of OD Data */
function initODSorting(sortOption) {
    const isClicked = resetButtonStyles('sortODOptionsContainer', sortOption);
    sortODOptionValue = (isClicked) ? sortOption.attr('id').substr(0,3) : 'none';
    applyODSorting();
}

/* Applies sorting function to OD data */
function applyODSorting() {
    if (!isGroupByOrigin && !isGroupByDestination) {
        odAreaLinesSetIdentifier = 'originCode';
        setLinesAreaSet();
    }
    odIdArray = Object.keys(odDataObject.data);
    switch (sortODOptionValue) {
        case 'min':
            odIdArray = odIdArray.sort((x,y) => {
                return odDataObject.data[x][typeODOptionValue].minValue - odDataObject.data[y][typeODOptionValue].minValue;
            });
            break;
        case 'max':
            odIdArray = odIdArray.sort((x,y) => {
                return odDataObject.data[y][typeODOptionValue].maxValue - odDataObject.data[x][typeODOptionValue].maxValue;
            });
            break;
        case 'avg':
            odIdArray = odIdArray.sort((x,y) => {
                return odDataObject.data[x][typeODOptionValue].avgValue - odDataObject.data[y][typeODOptionValue].avgValue;
            });
            break;
        case 'ori':
            odIdArray = odIdArray.sort((x,y) => {
                const xId = odDataObject.data[x].origin + odDataObject.data[x].destination;
                const yId = odDataObject.data[y].origin + odDataObject.data[y].destination;
                return xId.localeCompare(yId);
            });
            break;
        case 'des':
            odIdArray = odIdArray.sort((x,y) => {
                const xId = odDataObject.data[x].destination + odDataObject.data[x].origin;
                const yId = odDataObject.data[y].destination + odDataObject.data[y].origin;
                return xId.localeCompare(yId);
            });
            if (!isGroupByOrigin && !isGroupByDestination) {
                odAreaLinesSetIdentifier = 'destinationCode';
                setLinesAreaSet();
            }
    }
}

/**********************************************************************************************************************/
/* Functions for OD legend */

function displayODLegendContent(data, hoverOnCompared) {
    odLegendArea.html(`${data.origin} -> ${data.destination}`);
    if (isODLocalColorScale || hoverOnCompared) displayLegendStats(hoverOnCompared ? data : data[typeODOptionValue], true);
}

function hideODLegendContent() {
    odLegendArea.html('');
    for (let i = 0; i < 5; i++) {
        d3.select('#odStatColor' + i).style('background-color', null);
        d3.select('#odStatText' + i).html('');
    }
}