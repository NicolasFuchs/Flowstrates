const altDataObject = {};
const altDataArray = [];

let altZoom;
let altGeoZoom;
let altTimeZoom;

let altGeoScaleBand;
let altTimeScaleBand;

let altColorScale;

const altDataContainer = d3.select('#altDataContainer');
const altGeoContainer = d3.select('#altGeoContainer');
const altTimeContainer = d3.select('#altTimeContainer');
const altTimeLineContainer = d3.select('#altTimeLineContainer');
const altCategories = d3.select('#altCategories');

let altCanvasBox;
const altCanvas = d3.select('#altCanvas');
const altGeoCanvas = d3.select('#altGeoCanvas');

const altGeoLine = d3.selectAll('.altGeoLine');
const altLegend = d3.select('#altLegend');

const altLeftTimeHider = d3.select('#altLeftTimeHider');
const altRightTimeHider = d3.select('#altRightTimeHider');

let altHasYear;
let altHasMonth;
let altHasDay;

/* Adds Alternative Data Map */
function addAltMap(altDataOutputs) {
    const altDataOutput = altDataOutputs[0];
    altHasYear = altDataOutput[0].hasOwnProperty('Year');
    altHasMonth = altDataOutput[0].hasOwnProperty('Month');
    altHasDay = altDataOutput[0].hasOwnProperty('Day');

    createAltDataObject(altDataOutput);

    altColorScale = d3.scaleSequential().domain([altMinDataValue, altMaxDataValue]).interpolator(d3.interpolatePuBu);

    const timeHeight = altMaxTimeLength + 10;//Math.sin(Math.PI/4)
    const geoWidth = Math.ceil(altMaxGeoLength);//Math.ceil((dataFontSize + 2) / 2 * altMaxGeoLength);
    const geoHeight = Math.ceil(altDataContainer.node().getBoundingClientRect().height - timeHeight - altCategoriesHeight);

    altGeoContainer
        .style('height', geoHeight + 'px')
        .attr('height', geoHeight);

    altCategories
        .style('height', altCategories + 'px')
        .attr('height', altCategories);

    altGeoLine
        .style('width', geoWidth + 'px')
        .style('height', geoHeight + 'px')
        .attr('width', geoWidth)
        .attr('height', geoHeight);
    altLegend
        .style('width', geoWidth + 'px')
        .style('height', geoHeight + 'px')
        .attr('width', geoWidth)
        .attr('height', geoHeight);

    altLeftTimeHider.style('width', geoWidth + 'px');
    altRightTimeHider.style('width', geoWidth + 'px');
    altTimeContainer.style('height', timeHeight + 'px');

    altCanvasBox = altCanvas.node().getBoundingClientRect();
    altCanvasBox.height = Math.ceil(altCanvasBox.height);
    altCanvasBox.width = Math.ceil(altCanvasBox.width);
    altTimeLineContainer.style('width', altCanvasBox.width + 'px');
    altCanvas
        .style('height', altCanvasBox.height + 'px')
        .style('width', altCanvasBox.width + 'px')
        .attr('height', altCanvasBox.height)
        .attr('width', altCanvasBox.width);

    altGeoScaleBand = createAltGeoLine(altGeoK);
    altTimeScaleBand = createAltTimeLine(altTimeK);

    storeAltGeoZoomedLines();
    storeAltTimeZoomedLines();

    createGeoGraphics();
    createAltGraphics();

    displayAltGeoLine(false);
    displayAltTimeLine(false);

    altZoom = createAltZoom();
    altCanvas.call(altZoom).on('wheel.zoom', null);
    altGeoZoom = createAltGeoZoom();
    altGeoLine.call(altGeoZoom).on('mousedown.zoom', null);
    altTimeZoom = createAltTimeZoom();
    altTimeLineContainer.call(altTimeZoom).on('mousedown.zoom', null);
}

/**********************************************************************************************************************/
/* Creates a quick information access object and an array with Alt data */

const altIdArray = [];
let altMaxGeoLength = 0;
let altMaxTimeLength = 0;
let altMinDataValue = 0;
let altMaxDataValue = 0;

const altProperties = ['Geocode', 'SpecialGeo'];

function createAltDataObject(ALTData) {
    for (let altData of ALTData) {
        const id = altData['Geocode'];
        if (!altIdArray.includes(id)) altIdArray.push(id);
        const formattedDate = formatAltDate(altData);
        if (!altDataObject.hasOwnProperty(id)) altDataObject[id] = {};
        altDataObject[id].geo = altData['SpecialGeo'] || sideElts['left'].areaData[id]?.['Name'] || sideElts['right'].areaData[id]?.['Name'];
        if (!altDataObject[id].hasOwnProperty('data')) altDataObject[id].data = {};

        altMaxGeoLength = Math.max(altMaxGeoLength, PIXI.TextMetrics.measureText(altDataObject[id].geo, PIXI_STYLE).width); // TODO should be defined in generalScript.js
        altMaxTimeLength = Math.max(altMaxTimeLength, PIXI.TextMetrics.measureText(formattedDate, PIXI_STYLE).width);

        for (const key in altData) {
            if (key.endsWith('Data') && parseFloat(altData[key])) {
                const val = parseFloat(altData[key]);
                altDataObject[id].data[formattedDate] = val;
                altMinDataValue = Math.min(altMinDataValue, val);
                altMaxDataValue = Math.max(altMaxDataValue, val);
                altDataArray.push({id: id, date: formattedDate, data: val});
            }
        }

        altDataObject[id].data[formattedDate] |= 1;     // TODO should be recoded
    }
}

/**********************************************************************************************************************/
/* Alt Graphics creation and update procedure */

let altGraphics;
let altHighlightedGraphics;
let geoStage;

/* Creates geo PIXI graphics */
function createGeoGraphics() {
    const rendererOptions = {
        width: altGeoCanvas.node().getBoundingClientRect().width,
        height: altGeoCanvas.node().getBoundingClientRect().height,
        backgroundColor: '0xffffff',
        antialias: true,
        view: altGeoCanvas.node()
    };
    const renderer = PIXI.autoDetectRenderer(rendererOptions);
    geoStage = new PIXI.Container();

    animate();
    function animate() {
        renderer.render(geoStage);
        requestAnimationFrame(animate);
    }

    geoStage.addChild(altGeoDOMZoomedLines[altGeoK].geo);
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
    const renderer = PIXI.autoDetectRenderer(rendererOptions);
    const stage = new PIXI.Container();

    animate();
    function animate() {
        renderer.render(stage);
        requestAnimationFrame(animate);
    }

    altGraphics = new PIXI.Graphics();

    createAltTooltipInteraction(renderer);

    for (const altData of altDataArray) {
        altGraphics.beginFill('0x' + d3.color(altColorScale(altData.data)).formatHex().substr(1));
        altGraphics.drawRect(altTimeScaleBand(altData.date), altGeoScaleBand(altData.id), altTimeScaleBand.bandwidth(), altGeoScaleBand.bandwidth());
        altGraphics.endFill();
    }

    stage.addChild(altGraphics);
    stage.addChild(altHighlightedGraphics);
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
}

/**********************************************************************************************************************/
/* Alt data information (tooltip) creation */

const altTooltip = d3.select('#altTooltip').style('font-size', dataFontSize + 'px');

function createAltTooltipInteraction(renderer) {
    altHighlightedGraphics = new PIXI.Graphics();
    altHighlightedGraphics.interactive = true;
    altHighlightedGraphics.buttonMode = true;
    altHighlightedGraphics.hitArea = new PIXI.Rectangle(0, 0, altCanvasBox.width, altCanvasBox.height);
    const interactionManager = renderer.plugins['interaction'];
    altHighlightedGraphics
        .on('mousemove', (event) => {
            if (interactionManager.hitTest(event.data.global, altHighlightedGraphics) && !isAltScrolling) {
                const pos = event.data.getLocalPosition(altHighlightedGraphics);
                const x = pos.x;
                const y = pos.y;

                const geoScaleBandwidth = altGeoScaleBand.bandwidth();
                const timeScaleBandwidth = altTimeScaleBand.bandwidth();

                altHighlightedGraphics.clear();
                altHighlightedGraphics.beginFill(0xFFFFFF, 0.0);
                altHighlightedGraphics.lineStyle(1, 0x000000);
                altHighlightedGraphics.drawRect(x - (x % timeScaleBandwidth), y - (y % geoScaleBandwidth), timeScaleBandwidth, geoScaleBandwidth);

                const xIdentifier = altTimeScaleBand.domain()[Math.floor(x / timeScaleBandwidth)];
                const yIdentifier = altGeoScaleBand.domain()[Math.floor(y / geoScaleBandwidth)];
                const data = altDataObject[yIdentifier].data[xIdentifier];
                const previousData = altDataObject[yIdentifier].data[xIdentifier - 1];
                let tooltipText = `${altDataObject[yIdentifier].origin} -> ${altDataObject[yIdentifier].destination}<br>`;
                tooltipText += `${xIdentifier} : ${(data) ? data : '-'}<br>`;
                tooltipText += `Diff : ${(data && previousData) ? (data - previousData) : '-'}`;
                altTooltip.html(tooltipText);

                const globalPos = altHighlightedGraphics.toGlobal(new PIXI.Point(x - (x % timeScaleBandwidth) + timeScaleBandwidth, y - (y % geoScaleBandwidth)));
                const gx = globalPos.x;
                const gy = globalPos.y;
                altTooltip.style('bottom', altCanvasBox.height - gy - ((gy < 0) ? geoScaleBandwidth : 0) + 'px');
                altTooltip.style('left', altCanvasBox.left + gx + 'px');
                altTooltip.style('display', 'block');
            }
        })
        .on('mouseout', () => {
            altHighlightedGraphics.clear();
            altTooltip.style('display', 'none');
        });
}

/**********************************************************************************************************************/
/* OD Data and metrics interaction creation */

let altX = 0;
let altY = 0;
let altTimeK = 1;
let altGeoK = 1;
let isAltMove = false;
let isAltSync = false;
let isAltGeoMove = false;
let isAltGeoSync = false;
let isAltTimeMove = false;

let altLastX = 0;
let altLastY = 0;
let altGeoLastY = 0;
let altTimeLastX = 0;

/* Creates zoom interaction for Alt time metric */
function createAltTimeZoom() {
    return d3.zoom()
        .scaleExtent([1, altMaxTimeZoom])
        .translateExtent([[0, 0], [altCanvas.attr('width'), altTimeContainer.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('end', (event) => {
            altTimeK = event.transform.k;
            altX = event.transform.x;
            altTimeScaleBand = altTimeDOMZoomedLines[altTimeK].scaleBand;
            displayAltTimeLine(isAltTimeMove);
            if (!isAltTimeMove) {
                isAltMove = true;
                altCanvas.call(altZoom.translateBy, altX - altTimeLastX, 0);
                isAltMove = false;
            }
            altTimeLastX = altX;
        });
}

/* Creates zoom interaction for Alt geographical metric */
function createAltGeoZoom() {
    return d3.zoom()
        .scaleExtent([1, altMaxGeoZoom])
        .translateExtent([[0, 0],[altCanvas.attr('width'), altCanvas.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('end', (event) => {
            if (!isAltGeoSync) {
                altGeoK = event.transform.k;
                altY = event.transform.y;
                altGeoScaleBand = altGeoDOMZoomedLines[altGeoK].scaleBand;
                displayAltGeoLine(isAltGeoMove);
                if (!isAltGeoMove) {
                    isAltMove = true;
                    altCanvas.call(altZoom.translateBy, 0, altY - altGeoLastY);
                    isAltMove = false;
                    isAltGeoSync = true;
                    altGeoLine.call(altGeoZoom.transform, event.transform);    // Sync zoom between altGeoLines
                    isAltGeoSync = false;
                }
                altGeoLastY = altY;
            }
        });
}

let isAltScrolling = false;
let altBandGeo4Zoom;
let altDomaGeo4Zoom;
let altBandTime4Zoom;
let altDomaTime4Zoom;

/* Creates zoom (drag) interaction for Alt data */
function createAltZoom() {
    return d3.zoom()
        .on('start', () => {
            if (!isAltSync) {
                isAltScrolling = true;
                altHighlightedGraphics.clear();
                altTooltip.style('display', 'none');
                altBandGeo4Zoom = altGeoScaleBand.bandwidth();
                altDomaGeo4Zoom = altGeoScaleBand.domain().length;
                altBandTime4Zoom = altTimeScaleBand.bandwidth();
                altDomaTime4Zoom = altTimeScaleBand.domain().length;
            }
        })
        .on('end', () => {
            isAltScrolling = false;
            if (!isAltMove && !isAltSync) {
                isAltSync = true;
                altCanvas.call(altZoom.transform, new d3.ZoomTransform(1, altX, altY));
                isAltSync = false;
            }
        })
        .on('zoom', event => {
            if (!isAltSync) {
                altX = Math.max(altCanvasBox.width - altBandTime4Zoom * altDomaTime4Zoom, Math.min(event.transform.x, 0));
                altY = Math.max(altCanvasBox.height - altBandGeo4Zoom * altDomaGeo4Zoom, Math.min(event.transform.y, 0));
                if (!isAltMove) {
                    isAltGeoMove = true;
                    altGeoLine.call(altGeoZoom.translateBy, 0, (altY - altLastY) / altGeoK);
                    isAltGeoMove = false;
                    isAltTimeMove = true;
                    altTimeLineContainer.call(altTimeZoom.translateBy, (altX - altLastX) / altTimeK, 0);
                    isAltTimeMove = false;
                }
                updateAltGraphics();
                altLastX = altX;
                altLastY = altY;
            }
        });
}

/**********************************************************************************************************************/
/* Geographical and time metrics creation, update and display */

let altTimeValues = [];

/* Creates the Alt time metric */
function createAltTimeLine(altTimeScale) {
    const minDateInfo = altMinDate.split('.');
    const maxDateInfo = altMaxDate.split('.');
    let start = new Date();
    let end = new Date();
    if (altHasYear) {
        start.setFullYear(parseInt(minDateInfo.shift()));
        end.setFullYear(parseInt(maxDateInfo.shift()));
    }
    if (altHasMonth) {
        start.setMonth(parseInt(minDateInfo.shift()) - 1);
        end.setMonth(parseInt(maxDateInfo.shift()) - 1);
    }
    if (altHasDay) {
        start.setDate(parseInt(minDateInfo.shift()));
        end.setDate(parseInt(maxDateInfo.shift()));
    }

    let format = (altHasYear) ? '%Y' : '';
    format += (altHasMonth) ? ((altHasYear) ? '.' : '') + '%m' : '';
    format += (altHasDay) ? ((altHasYear || altHasMonth) ? '.' : '') + '%d' : '';
    const setFormat = d3.timeFormat(format);
    if (altHasDay) {
        start.setDate(start.getDate() - 1);
        altTimeValues[2] = d3.timeDays(start, end, 1).map(setFormat);
    }
    if (altHasMonth) {
        start.setMonth(start.getMonth() - 1);
        altTimeValues[1] = d3.timeMonths(start, end, 1).map(setFormat);
    }
    if (altHasYear) {
        start.setFullYear(start.getFullYear() - 1);
        altTimeValues[0] = d3.timeYears(start, end, 1).map(setFormat);
    }

    return d3.scaleBand()
        .domain(altTimeValues[0])
        .range([0, altCanvasBox.width * altTimeScale]);
}

let altTimeLine;

/* Displays the Alt time metric */
function displayAltTimeLine(onlyTranslation) {
    if (!onlyTranslation) {
        const altTimeDOMZoomedLine = altTimeDOMZoomedLines[altTimeK];
        altTimeLineContainer.node().innerHTML = '';
        altTimeLineContainer.node().appendChild(altTimeDOMZoomedLine.time);
        altTimeLine = d3.select('#altTimeDOMZoomedLine');
    }
    altTimeLine.style('left', Math.floor(altX) + 'px');
}

/* Creates the Alt geographical metric */
function createAltGeoLine(altGeoScale) {
    return d3.scaleBand()
        .domain(altIdArray)
        .range([0, altCanvasBox.height * altGeoScale]);
}

let geoGraphics;

/* Displays the Alt geographical metric */
function displayAltGeoLine(onlyTranslation) {
    if (!onlyTranslation) {
        const geoDOMZoomedLines = altGeoDOMZoomedLines[altGeoK];
        if (geoStage.children.length) geoStage.removeChildAt(0);
        geoGraphics = geoDOMZoomedLines.geo;
        geoStage.addChild(geoGraphics);
    }
    geoGraphics.position.y = Math.floor(altY);
}

let altMaxGeoZoom;
let altMaxTimeZoom;
let altGeoDOMZoomedLines = {};
let altTimeDOMZoomedLines = {};

/* Stores the computed geoLine DOM elements according to zoom level */
function storeAltGeoZoomedLines() {
    const spaceCheck = altCanvasBox.height / altGeoScaleBand.bandwidth();
    altMaxGeoZoom = Math.pow(2, Math.ceil(Math.log(spaceCheck)/Math.log(2)));
    for (let i = 0; i <= Math.ceil(Math.log(spaceCheck)/Math.log(2)); i++) {
        const scale = Math.pow(2, i);
        const scaleBand = createAltGeoLine(scale);
        const reducedDomain = getReducedDomain(scaleBand, spaceScaleGeo);
        altGeoDOMZoomedLines[scale] = createAltDOMGeoLine(scaleBand, reducedDomain);
        altGeoDOMZoomedLines[scale].scaleBand = scaleBand;
    }
}

/* Stores the computed timeLine DOM elements according to zoom level */
function storeAltTimeZoomedLines() {
    const spaceCheck = altCanvasBox.width / altTimeScaleBand.bandwidth();
    altMaxTimeZoom = Math.pow(2, Math.ceil(Math.log(spaceCheck)/Math.log(2)));
    for (let i = 0; i <= Math.ceil(Math.log(spaceCheck)/Math.log(2)); i++) {
        const scale = Math.pow(2, i);
        const scaleBand = createAltTimeLine(scale);
        const reducedDomain = getReducedDomain(scaleBand, spaceScaleTime);
        altTimeDOMZoomedLines[scale] = createAltDOMTimeLine(scaleBand, reducedDomain);
        altTimeDOMZoomedLines[scale].scaleBand = scaleBand;
    }
}

/* Creates the computed geoLine DOM element */
function createAltDOMGeoLine(scaleBand, reducedDomain) {
    const offset = (scaleBand.bandwidth() - dataFontSize) / 2;
    let lastTop;

    const geoGraphics = new PIXI.Container();

    for (let geoText of reducedDomain) {
        const top = scaleBand(geoText) + offset;
        const obj = altDataObject[geoText];

        const originText = new PIXI.BitmapText(
            obj.geo,
            { fontName: 'helvetica' }
        );
        originText.roundPixels = true;
        originText.anchor.set(1, 0);
        originText.position.x = Math.floor(altGeoCanvas.node().getBoundingClientRect().width - 5);
        originText.position.y = Math.floor(top);
        geoGraphics.addChild(originText);

        if (lastTop && altGeoScaleBand.domain().length !== reducedDomain.length) {    // Add the three dots
            const midTop = (top + lastTop) / 2;

            const originDots = new PIXI.BitmapText(
                '···',
                { fontName: 'helvetica' }
            );
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
            //const midLeft = (3 * left + 2 * lastLeft) / 5;
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
/* Utility functions */

let altMinDate;
let altMaxDate;

/* Formats Alt data date using format YYYY.MM.DD */
function formatAltDate(altData) {
    let date = '';
    if (altHasYear) date += altData['Year'];
    if (altHasMonth) date += ((date === '') ? '' : '.') + altData['Month'];
    if (altHasDay) date += ((date === '') ? '' : '.') + altData['Day'];
    if (!altMinDate || date < altMinDate) altMinDate = date;
    if (!altMaxDate || date > altMaxDate) altMaxDate = date;
    return date;
}