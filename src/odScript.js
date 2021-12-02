const odDataObject = {};
const odDataArray = [];

let odZoom;
let odGeoZoom;
let odTimeZoom;

let odGeoScaleBand;
let odTimeScaleBand;

let odColorScale;

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

const odFit = d3.select('#odFit');

let odHasYear;
let odHasMonth;
let odHasDay;

/* Adds Origin-destination Data Map */
function addODMap(odDataOutput) {
    odHasYear = odDataOutput[0].hasOwnProperty('Year');
    odHasMonth = odDataOutput[0].hasOwnProperty('Month');
    odHasDay = odDataOutput[0].hasOwnProperty('Day');

    createODDataObject(odDataOutput);
    odColorScale = d3.scaleSequential().domain([odMinDataValue, odMaxDataValue]).interpolator(d3.interpolateOrRd);

    const timeHeight = Math.ceil(odMaxTimeLength) + 10;
    const geoWidth = Math.ceil(odMaxGeoLength);
    const geoHeight = Math.ceil(odDataContainer.node().getBoundingClientRect().height - timeHeight);
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
    odTimeContainer
        .style('height', timeHeight + 'px')
        .attr('height', timeHeight);

    odCanvasBox = odCanvas.node().getBoundingClientRect();
    odCanvasBox.height = Math.ceil(odCanvasBox.height);
    odCanvasBox.width = Math.ceil(odCanvasBox.width);
    odTimeLineContainer.style('width', odCanvasBox.width + 'px');
    odCanvas
        .style('height', odCanvasBox.height + 'px')
        .style('width', odCanvasBox.width + 'px')
        .attr('height', odCanvasBox.height)
        .attr('width', odCanvasBox.width);

    displayODTimeLine(false);
    displayODGeoLine(false);

    createOriginGraphics();
    createDestinationGraphics();
    createODGraphics();

    odZoom = createODZoom();
    odCanvas.call(odZoom).on('wheel.zoom', null);
    odGeoZoom = createODGeoZoom();
    odGeoLines.call(odGeoZoom).on('mousedown.zoom', null);
    odTimeZoom = createODTimeZoom();
    odTimeLineContainer.call(odTimeZoom).on('mousedown.zoom', null);

    odFit.on('click', () => {
        odTimeLineContainer.call(odTimeZoom.transform, d3.zoomIdentity);
        odGeoLine.call(odGeoZoom.transform, d3.zoomIdentity);
    });
}

/**********************************************************************************************************************/
/* Creates a quick information access object and an array with OD data */

const odIdArray = [];
let odMaxGeoLength = 0;
let odMaxTimeLength = 0;
let odMinDataValue = 0;
let odMaxDataValue = 0;

const odProperties = ['Year', 'Month', 'Day', 'OriginCode', 'DestinationCode', 'SpecialOrigin', 'SpecialDestination'];  // TODO CHECk DATA

function createODDataObject(ODData) {
    for (let oddata of ODData) {
        const id = oddata['OriginCode'] + '_' + oddata['DestinationCode'];

        if (!odIdArray.includes(id)) odIdArray.push(id);
        if (!odDataObject.hasOwnProperty(id)) odDataObject[id] = {};

        odDataObject[id].origin = oddata['SpecialOrigin'] || sideElts['left'].areaData[oddata['OriginCode']]?.['Name'];
        odDataObject[id].destination = oddata['SpecialDestination'] || sideElts['right'].areaData[oddata['DestinationCode']]?.['Name'];

        if (!odDataObject[id].hasOwnProperty('data')) odDataObject[id].data = {};
        
        const formattedDate = formatODDate(odHasYear, odHasMonth, odHasDay, oddata);
        if (!odMinDate || formattedDate < odMinDate) odMinDate = formattedDate;
        if (!odMaxDate || formattedDate > odMaxDate) odMaxDate = formattedDate;

        odMaxGeoLength = Math.max(odMaxGeoLength, PIXI.TextMetrics.measureText(odDataObject[id].origin, PIXI_STYLE).width, PIXI.TextMetrics.measureText(odDataObject[id].destination, PIXI_STYLE).width);
        odMaxTimeLength = Math.max(odMaxTimeLength, PIXI.TextMetrics.measureText(formattedDate, PIXI_STYLE).width);

        for (const key in oddata) {
            if (key.endsWith('Data') && parseFloat(oddata[key])) {
                const val = parseFloat(oddata[key]);
                odDataObject[id].data[formattedDate] = val;
                odMinDataValue = Math.min(odMinDataValue, val);
                odMaxDataValue = Math.max(odMaxDataValue, val);
                odDataArray.push({id: id, origin: odDataObject[id].origin, destination: odDataObject[id].destination, date: formattedDate, data: val});
            }
        }
    }
}

/**********************************************************************************************************************/
/* OD Graphics creation and update procedure */

let odGraphics = new PIXI.Graphics();
let odHighlightedGraphics = new PIXI.Graphics();
let originStage = new PIXI.Container();
let destinationStage = new PIXI.Container();

/* Creates origin PIXI graphics */
function createOriginGraphics() {
    const rendererOptions = {
        width: originCanvas.node().getBoundingClientRect().width,
        height: originCanvas.node().getBoundingClientRect().height,
        backgroundColor: '0xffffff',
        antialias: true,
        view: originCanvas.node()
    };
    const renderer = PIXI.autoDetectRenderer(rendererOptions);
    animate();
    function animate() {
        renderer.render(originStage);
        requestAnimationFrame(animate);
    }
}

/* Creates destination PIXI graphics */
function createDestinationGraphics() {
    const rendererOptions = {
        width: destinationCanvas.node().getBoundingClientRect().width,
        height: destinationCanvas.node().getBoundingClientRect().height,
        backgroundColor: '0xffffff',
        antialias: true,
        view: destinationCanvas.node()
    };
    const renderer = PIXI.autoDetectRenderer(rendererOptions);
    animate();
    function animate() {
        renderer.render(destinationStage);
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
    const renderer = PIXI.autoDetectRenderer(rendererOptions);
    const stage = new PIXI.Container();

    animate();
    function animate() {
        renderer.render(stage);
        requestAnimationFrame(animate);
    }

    createODTooltipInteraction(renderer);

    for (const oddata of odDataArray) {
        odGraphics.beginFill('0x' + d3.color(odColorScale(oddata.data)).formatHex().substr(1));
        odGraphics.drawRect(odTimeScaleBand(oddata.date), odGeoScaleBand(oddata.id), odTimeScaleBand.bandwidth(), odGeoScaleBand.bandwidth());
        odGraphics.endFill();
    }

    stage.addChild(odGraphics);
    stage.addChild(odHighlightedGraphics);
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
}

/**********************************************************************************************************************/
/* OD data information (tooltip) creation */

const odTooltip = d3.select('#odTooltip').style('font-size', dataFontSize + 'px');

function createODTooltipInteraction(renderer) {
    odHighlightedGraphics.interactive = true;
    odHighlightedGraphics.buttonMode = true;
    odHighlightedGraphics.hitArea = new PIXI.Rectangle(0, 0, odCanvasBox.width, odCanvasBox.height);
    const interactionManager = renderer.plugins['interaction'];
    odHighlightedGraphics
        .on('mousemove', (event) => {
            if (interactionManager.hitTest(event.data.global, odHighlightedGraphics) && !isODScrolling) {
                const pos = event.data.getLocalPosition(odHighlightedGraphics);
                const x = pos.x;
                const y = pos.y;

                const geoScaleBandwidth = odGeoScaleBand.bandwidth();
                const timeScaleBandwidth = odTimeScaleBand.bandwidth();

                odHighlightedGraphics.clear();
                odHighlightedGraphics.beginFill(0xFFFFFF, 0.0);
                odHighlightedGraphics.lineStyle(1, 0x000000);
                odHighlightedGraphics.drawRect(x - (x % timeScaleBandwidth), y - (y % geoScaleBandwidth), timeScaleBandwidth, geoScaleBandwidth);

                const xIdentifier = odTimeScaleBand.domain()[Math.floor(x / timeScaleBandwidth)];
                const yIdentifier = odGeoScaleBand.domain()[Math.floor(y / geoScaleBandwidth)];
                const data = odDataObject[yIdentifier].data[xIdentifier];
                const previousData = odDataObject[yIdentifier].data[xIdentifier - 1];
                let tooltipText = `${odDataObject[yIdentifier].origin} -> ${odDataObject[yIdentifier].destination}<br>`;
                tooltipText += `${xIdentifier} : ${(data) ? data : '-'}<br>`;
                tooltipText += `Diff : ${(data && previousData) ? (data - previousData) : '-'}`;
                odTooltip.html(tooltipText);

                const globalPos = odHighlightedGraphics.toGlobal(new PIXI.Point(x - (x % timeScaleBandwidth) + timeScaleBandwidth, y - (y % geoScaleBandwidth)));
                const gx = globalPos.x;
                const gy = globalPos.y;
                odTooltip.style('bottom', odCanvasBox.height - gy - ((gy < 0) ? geoScaleBandwidth : 0) + 'px');
                odTooltip.style('left', odCanvasBox.left + gx + 'px');
                odTooltip.style('display', 'block');
            }
        })
        .on('mouseout', () => {
            odHighlightedGraphics.clear();
            odTooltip.style('display', 'none');
        });
}

/**********************************************************************************************************************/
/* OD Data and metrics interaction creation */

let odX = 0;
let odY = 0;
let odTimeK = 1;
let odGeoK = 1;
let isODMove = false;
let isODSync = false;
let isODGeoMove = false;
let isODGeoSync = false;
let isODTimeMove = false;

let odLastX = 0;
let odLastY = 0;
let odGeoLastY = 0;
let odTimeLastX = 0;

/* Creates zoom interaction for OD time metric */
function createODTimeZoom() {
    return d3.zoom()
        .scaleExtent([1, Math.ceil(odCanvas.attr('width')/odTimeScaleBand.bandwidth())])
        .translateExtent([[0, 0], [odCanvas.attr('width'), odTimeContainer.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('zoom', (event) => {
            odTimeK = event.transform.k;
            odX = event.transform.x;
            displayODTimeLine(isODTimeMove);
            if (!isODTimeMove) {
                isODMove = true;
                odCanvas.call(odZoom.translateBy, odX - odTimeLastX, 0);
                isODMove = false;
            }
            odTimeLastX = odX;
        });
}

/* Creates zoom interaction for OD geographical metric */
function createODGeoZoom() {
    return d3.zoom()
        .scaleExtent([1, Math.ceil(odCanvas.attr('height')/odGeoScaleBand.bandwidth())])
        .translateExtent([[0, 0],[odGeoLine.attr('width'), odGeoLine.attr('height')]])
        .wheelDelta((event) => -Math.sign(event.deltaY))
        .on('zoom', (event) => {
            if (!isODGeoSync) {
                odGeoK = event.transform.k;
                odY = event.transform.y;
                displayODGeoLine(isODGeoMove);
                if (!isODGeoMove) {
                    isODMove = true;
                    odCanvas.call(odZoom.translateBy, 0, odY - odGeoLastY);
                    isODMove = false;
                    isODGeoSync = true;
                    odGeoLines.call(odGeoZoom.transform, event.transform);    // Sync zoom between odGeoLines
                    isODGeoSync = false;
                }
                odGeoLastY = odY;
            }
        });
}

let isODScrolling = false;
let odBandGeo4Zoom;
let odDomaGeo4Zoom;
let odBandTime4Zoom;
let odDomaTime4Zoom;

/* Creates zoom (drag) interaction for OD data */
function createODZoom() {
    return d3.zoom()
        .on('start', () => {
            if (!isODSync) {
                isODScrolling = true;
                odHighlightedGraphics.clear();
                odTooltip.style('display', 'none');
                odBandGeo4Zoom = odGeoScaleBand.bandwidth();
                odDomaGeo4Zoom = odGeoScaleBand.domain().length;
                odBandTime4Zoom = odTimeScaleBand.bandwidth();
                odDomaTime4Zoom = odTimeScaleBand.domain().length;
            }
        })
        .on('end', () => {
            isODScrolling = false;
            if (!isODMove && !isODSync) {
                isODSync = true;
                odCanvas.call(odZoom.transform, new d3.ZoomTransform(1, odX, odY));
                isODSync = false;
            }
        })
        .on('zoom', event => {
            if (!isODSync) {
                odX = Math.max(odCanvasBox.width - odBandTime4Zoom * odDomaTime4Zoom, Math.min(event.transform.x, 0));
                odY = Math.max(odCanvasBox.height - odBandGeo4Zoom * odDomaGeo4Zoom, Math.min(event.transform.y, 0));
                if (!isODMove) {
                    isODGeoMove = true;
                    odGeoLines.call(odGeoZoom.translateBy, 0, (odY - odLastY) / odGeoK);
                    isODGeoMove = false;
                    isODTimeMove = true;
                    odTimeLineContainer.call(odTimeZoom.translateBy, (odX - odLastX) / odTimeK, 0);
                    isODTimeMove = false;
                }
                updateODGraphics();
                odLastX = odX;
                odLastY = odY;
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
        odTimeScaleBand = createODTimeLine(odTimeK);
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
        odGeoScaleBand = createODGeoLine(odGeoK);
        zoomedLines = storeODGeoScaleBand(fixedOdGeoK, odGeoScaleBand);
    }
    odGeoScaleBand = zoomedLines.scaleBand;
    return zoomedLines;
}

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

let odTimeValues = [];

/* Creates the OD time metric */
function createODTimeLine(odTimeScale) {
    const minDateInfo = odMinDate.split('.');
    const maxDateInfo = odMaxDate.split('.');
    let start = new Date();
    let end = new Date();
    if (odHasYear) {
        start.setFullYear(parseInt(minDateInfo.shift()));
        end.setFullYear(parseInt(maxDateInfo.shift()));
    }
    if (odHasMonth) {
        start.setMonth(parseInt(minDateInfo.shift()) - 1);
        end.setMonth(parseInt(maxDateInfo.shift()) - 1);
    }
    if (odHasDay) {
        start.setDate(parseInt(minDateInfo.shift()));
        end.setDate(parseInt(maxDateInfo.shift()));
    }

    let format = (odHasYear) ? '%Y' : '';
    format += (odHasMonth) ? ((odHasYear) ? '.' : '') + '%m' : '';
    format += (odHasDay) ? ((odHasYear || odHasMonth) ? '.' : '') + '%d' : '';
    const setFormat = d3.timeFormat(format);
    if (odHasDay) {
        start.setDate(start.getDate() - 1);
        odTimeValues[2] = d3.timeDays(start, end, 1).map(setFormat);
    }
    if (odHasMonth) {
        start.setMonth(start.getMonth() - 1);
        odTimeValues[1] = d3.timeMonths(start, end, 1).map(setFormat);
    }
    if (odHasYear) {
        start.setFullYear(start.getFullYear() - 1);
        odTimeValues[0] = d3.timeYears(start, end, 1).map(setFormat);
    }

    return d3.scaleBand()
        .domain(odTimeValues[0])
        .range([0, odCanvasBox.width * odTimeScale]);
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

/* Creates the OD geographical metric */
function createODGeoLine(odGeoScale) {
    return d3.scaleBand()
        .domain(odIdArray)
        .range([0, odCanvasBox.height * odGeoScale]);
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

let odGeoDOMZoomedLines = {};
let odTimeDOMZoomedLines = {};

/* Creates the computed DOM geoLines */
function createODDOMGeoLine(scaleBand, reducedDomain) {
    const offset = (scaleBand.bandwidth() - dataFontSize) / 2;
    let lastTop;

    const originGraphics = new PIXI.Container();
    const destinationGraphics = new PIXI.Container();

    for (let geoText of reducedDomain) {
        const top = scaleBand(geoText) + offset;
        const obj = odDataObject[geoText];

        const originText = new PIXI.BitmapText(
            obj['origin'],
            { fontName: 'helvetica' }
        );
        originText.roundPixels = true;
        originText.anchor.set(1, 0);
        originText.position.x = Math.floor(originCanvas.node().getBoundingClientRect().width - 5);
        originText.position.y = Math.floor(top);
        originGraphics.addChild(originText);

        const destinationText = new PIXI.BitmapText(
            obj['destination'],
            { fontName: 'helvetica' }
        );
        destinationText.roundPixels = true;
        destinationText.position.x = 5;
        destinationText.position.y = Math.floor(top);
        destinationGraphics.addChild(destinationText);

        if (lastTop && odGeoScaleBand.domain().length !== reducedDomain.length) {    // Add the three dots
            const midTop = (top + lastTop) / 2;

            const originDots = new PIXI.BitmapText(
                '···',
                { fontName: 'helvetica' }
            );
            originDots.roundPixels = true;
            originDots.anchor.set(1, 0);
            originDots.position.x = Math.floor(originCanvas.node().getBoundingClientRect().width - 5);
            originDots.position.y = Math.floor(midTop);
            originGraphics.addChild(originDots);

            const destinationDots = new PIXI.BitmapText(
                '···',
                { fontName: 'helvetica' }
            );
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
/* Utility functions */

let odMinDate;
let odMaxDate;

/* Formats OD data date using format YYYY.MM.DD */
/*function formatODDate(odData) {
    let date = '';
    if (odHasYear) date += odData['Year'];
    if (odHasMonth) date += ((date === '') ? '' : '.') + odData['Month'];
    if (odHasDay) date += ((date === '') ? '' : '.') + odData['Day'];
    if (!odMinDate || date < odMinDate) odMinDate = date;
    if (!odMaxDate || date > odMaxDate) odMaxDate = date;
    return date;
}*/
function formatODDate(hasYear, hasMonth, hasDay, data) {
    let date = '';
    if (hasYear) date += data['Year'];
    if (hasMonth) date += ((hasYear) ? '.' : '') + data['Month'];
    if (hasDay) date += ((hasMonth) ? '.' : '') + data['Day'];
    //if (!odMinDate || date < odMinDate) odMinDate = date;
    //if (!odMaxDate || date > odMaxDate) odMaxDate = date;
    return date;
}