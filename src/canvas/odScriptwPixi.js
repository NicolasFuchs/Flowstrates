const ogDataUrl = '../../data/populationReallySmall.csv';
//const ogDataUrl = '../../data/populationSmall.csv';
//const ogDataUrl = '../../data/populationSmall2.csv';
//const ogDataUrl = '../../data/population.csv';

const oddataObject = {};
const oddataArray = [];

let hasYear;
let hasMonth;
let hasDay;

let odGeoLine;
let odTimeline;
let odGeoBandwidth;
let odTimeBandwidth;

let odZoom;
let odGeoZoom;
let odTimeZoom;

let colorScale;

const canvas = d3.select('#midBottomCanvas');
let canvasWidth;
let canvasHeight;

const originContainer = d3.select('#midOrigins');
const destinationContainer = d3.select('#midDestinations');
let midBottomContainerBox;

d3.csv(ogDataUrl).then(ODData => {
    hasYear = ODData[0].hasOwnProperty('Year');
    hasMonth = ODData[0].hasOwnProperty('Month');
    hasDay = ODData[0].hasOwnProperty('Day');

    createODDataObject(ODData);
    colorScale = d3.scaleSequential().domain([0, maxDataValue]).interpolator(d3.interpolateOrRd);

    d3.select('#midBottomContainer').style('height', d3.select('#oddataContainer').node().getBoundingClientRect().height - (oddataFontSize * 3) + 'px');

    const geoWidth = 5.5 * maxLength + 'px';
    d3.selectAll('.geoLine').style('width', geoWidth);
    d3.select('#leftBottomTimeHider').style('width', geoWidth);
    d3.select('#rightBottomTimeHider').style('width', geoWidth);

    d3.select('#bottomTimeContainer').style('height', oddataFontSize * 3 + 'px');

    midBottomContainerBox = d3.select('#midBottomContainer').node().getBoundingClientRect();

    createGeoLine();
    displayGeoLine();

    const canvasBox = canvas.node().getBoundingClientRect();
    d3.select('#bottomTimeLine').style('width', canvasBox.width + 'px');
    canvas.attr('height', canvasBox.height).attr('width', canvasBox.width);
    canvasWidth = canvasBox.width;
    canvasHeight = canvasBox.height;

    createTimeline();
    displayTimeline();

    addOutlineData();

    createPixi();

    odZoom = addODZoom();
    canvas.call(odZoom);

    odTimeZoom = addODTimeZoom();
    d3.select('#bottomTimeLine').call(odTimeZoom);

    odGeoZoom = addODGeoZoom();
    d3.selectAll('.geoLine').call(odGeoZoom);
});

let graphics;
let highlightedGraphics;
function createPixi() {

    const rendererOptions = {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: oddataBackgroundColor,
        antialias: true,
        view: canvas.node()
    };
    const renderer = PIXI.autoDetectRenderer(rendererOptions);

    const stage = new PIXI.Container();

    animate();
    function animate() {
        renderer.render(stage);
        requestAnimationFrame(animate);
    }

    graphics = new PIXI.Graphics();
    highlightedGraphics = new PIXI.Graphics();

    let lastHighlightIndex;

    graphics.interactive = true;
    graphics.buttonMode = true;
    graphics.hitArea = new PIXI.Rectangle(0,0,canvasWidth,canvasHeight);
    const interactionManager = renderer.plugins.interaction;
    graphics.on('mousemove', (event) => {
        if (interactionManager.hitTest(event.data.global, graphics)) {
            const pos = event.data.getLocalPosition(graphics);
            const x = pos.x;
            const y = pos.y;
            highlightedGraphics.clear();
            highlightedGraphics.beginFill(0xFFFFFF, 0.0);
            highlightedGraphics.lineStyle(0.1, 0x000000);   // linestyle according to zoom
            highlightedGraphics.drawRect(x - x % odTimeBandwidth, y - y % odGeoBandwidth, odTimeBandwidth, odGeoBandwidth);
        }
    });

    for (const oddata of oddataArray) {
        graphics.beginFill('0x' + d3.color(colorScale(oddata.data)).formatHex().substr(1));
        const outline = oddata.outline;
        graphics.drawRect(outline[0][0], outline[0][1], odTimeline.bandwidth(), odGeoLine.bandwidth());
        graphics.endFill();
    }

    stage.addChild(graphics);
    stage.addChild(highlightedGraphics);
}

let odX = 0;
let odY = 0;
let isMetricsMove = false;
function addODGeoZoom() {
    return d3.zoom()
        .on('zoom', (event) => {
            console.log(event);
            console.log('odY ', odY, odScale);
            //console.log('K in odGeoZoom ', event.transform.k);
            //console.log('in odGeoZoom ', odY, event.transform.k, odGeoScale, odScale);
            const newY = odY + (canvasHeight/event.transform.k - canvasHeight/odGeoScale) / (2 * odScale);
            console.log('left result ', newY);
            //console.log((canvasHeight/(2 * event.transform.k * odScale) - canvasHeight/(2 * odGeoScale * odScale)));
            odGeoScale = event.transform.k;
            //const newK = odGeoScale * odScale;
            //graphics.scale.y = newK;
            //highlightedGraphics.scale.y = newK;
            odZoom.translateExtent([[0, 0],[odTimeScale * canvas.attr('width'), odGeoScale * canvas.attr('height')]]);
            //geoThrottle(newK, newY);
            isMetricsMove = true;
            //console.log('in odGeoZoom ', odX, newY, odScale);
            /*const zoomIdentity = d3.zoomIdentity;
            zoomIdentity.x = odX;
            zoomIdentity.y = newY;
            zoomIdentity.k = odScale;*/
            event.transform.x = odX;
            event.transform.y = newY;
            canvas.call(
                odZoom.transform,
                event.transform
            );
            isMetricsMove = false;
        })
        .scaleExtent([1, Infinity])
        .translateExtent([0,0],[0,0]);
}

const geoThrottle = _.throttle(moveODGeoMetrics, 100, {leading: false});

function moveODGeoMetrics(newK, newY) {
    updateGeoLine(newK);
    displayGeoLine(newY);
}

function addODTimeZoom() {
    return d3.zoom()
        .on('zoom', (event) => {
            odTimeScale = event.transform.k;
            const newK = odTimeScale * odScale;
            graphics.scale.x = newK;
            highlightedGraphics.scale.x = newK;
            odZoom.translateExtent([[0, 0],[odTimeScale * canvas.attr('width'), odGeoScale * canvas.attr('height')]]);
            //timeThrottle(newK);
        })
        .scaleExtent([1, Infinity])
        .translateExtent([0,0],[0,0]);
}

/*const timeThrottle = _.throttle(moveODTimeMetrics, 100, {leading: false});

function moveODTimeMetrics(newK) {
    updateTimeline(newK);
    displayTimeline();
}*/

function moveODMetrics(newX, newY, newK) {
    updateTimeline(odTimeScale * newK);
    displayTimeline(newX);
    updateGeoLine(odGeoScale * newK);
    displayGeoLine(newY);
}
const throttle = _.throttle(moveODMetrics, 100, {leading: false});

let odScale = 1;
let odTimeScale = 1;
let odGeoScale = 1;
function addODZoom() {
    /*return d3.zoom()
        .on('zoom', (event) => {
            console.log('zoom called');
            let newScale = event.transform.k;

            if (newScale !== odScale) {
                odScale = newScale;
                d3.select('#pixiCanvas').style('t', 'scale(' + event.transform.k + ')');
                d3.select('#pixiCanvas').node().getContext('2d').translate(event.transform.x, event.transform.y);
                d3.select('#pixiCanvas').node().getContext('2d').scale(event.transform.k, event.transform.k);
                d3.select('.odRect.hovered').attr('stroke-width', 2 / odScale);
                createGeoLine();
                displayGeoLine();
                createTimeline();
                displayTimeline();
            }
            odTooltip.attr('id', 'odTooltip').style('display', 'none');
            d3.selectAll('.geoLine').style('transform', 'translateY(' + event.transform.y + 'px)');
            d3.select('#bottomTimeLine').style('transform', 'translateX(' + event.transform.x + 'px)');
            checkODTimeDisplay();
        })
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0],[canvas.attr('width'), canvas.attr('height')]]);*/

    return d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0],[canvas.attr('width'), canvas.attr('height')]])
        .on('zoom', event => {
            console.log('identity ', d3.zoomIdentity);
            console.log('odY odScale ', odY, odScale);
            console.log('middle result ', odY + (canvasHeight/event.transform.k - canvasHeight/odScale) / 2);
            const newX = event.transform.x;
            const newY = event.transform.y;
            const newK = event.transform.k;
            odX = newX;
            odY = newY;
            //console.log(newY);
            graphics.position.x = newX;
            graphics.position.y = newY;
            graphics.scale.x = odTimeScale * newK;
            graphics.scale.y = odGeoScale * newK;
            highlightedGraphics.position.x = newX;
            highlightedGraphics.position.y = newY;
            highlightedGraphics.scale.x = odTimeScale * newK;
            highlightedGraphics.scale.y = odGeoScale * newK;
            //console.log('in odZoom ', newX, newY, newK);
            if (newK === odScale && !isMetricsMove) {
                d3.select('#bottomTimeLine').style('transform', 'translateX(' + newX + 'px)');
                d3.selectAll('.geoLine').style('transform', 'translateY(' + newY + 'px)');
            } else {
                odScale = newK;
                throttle(newX, newY, newK);
            }
        });
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

/*function addNonExistingData() {
    for (const geoTick of odGeoLine.domain()) {
        for (const timeTick of odTimeline.domain()) {
            if (!existingDates.hasOwnProperty(geoTick + timeTick)) {
                const geoTickObj = oddataObject[geoTick];
                oddataArray.push({id: geoTick, origin: geoTickObj.origin, destination: geoTickObj.destination, date: timeTick, data: 'n/a'});
            }
        }
    }
    oddataArray.sort((d1, d2) => { return (d1['date'] < d2['date']) ? -1 : 1 });
}*/

function addOutlineData() {
    const width = odTimeline.bandwidth();
    const height = odGeoLine.bandwidth();
    for (const oddata of oddataArray) {
        const x = odTimeline(oddata.date);
        const y = odGeoLine(oddata.id);
        oddata.outline = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
    }
}



function getFillColor(d) {
    //const data = d.data;
    /*if (data === 'n/a') {
        console.log('grey color');
        return [128,128,128];
    } else {*/
        //const color = d3.color(colorScale(data));
        const color = d3.color(colorScale(d.data));
        return [color.r, color.g, color.b];
    //}
}

function getLineColor(d) {
    if ((d.id + d.date) === hoveredId) {
        return [0,0,0,255];
    } else {
        return [0,0,0,0];
    }
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

    /*odTimeline = d3.scaleBand()
        //.domain(timeValues)
        .domain(timeValues[0])
        .range([0, d3.select('#bottomTimeLine').node().getBoundingClientRect().width * odScale]);*/
    odTimeline = d3.scaleBand()
        //.domain(timeValues)
        .domain(timeValues[0])
        .range([0, d3.select('#bottomTimeLine').node().getBoundingClientRect().width * Math.pow(2, 0)]); // oldZoom before instead of 0
    odTimeBandwidth = odTimeline.bandwidth();
}

function updateTimeline(scale) {
    /*odTimeline = d3.scaleBand()
        .domain(timeValues[timeMode])
        .range([0, d3.select('#bottomTimeLine').node().getBoundingClientRect().width * scale]);*/
    odTimeline.range([0, d3.select('#bottomTimeLine').node().getBoundingClientRect().width * scale]);
}

function displayTimeline(newX) {
    const bottomTimeLine = d3.select('#bottomTimeLine');
    const reducedDomain = getReducedDomain(odTimeline);
    d3.selectAll('.odTimeText').remove();
    if (newX) {
        d3.select('#bottomTimeLine').style('transform', 'translateX(' + newX + 'px)');
    }
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
    /*odGeoLine = d3.scaleBand()
        .domain(idArray)
        .range([0, d3.select('#midBottomContainer').node().getBoundingClientRect().height * odScale]);*/
    odGeoLine = d3.scaleBand()
        .domain(idArray)
        //.range([0, d3.select('#midBottomContainer').node().getBoundingClientRect().height * Math.pow(2, oldZoom)]);
        .range([0, midBottomContainerBox.height * Math.pow(2, 0)]);  // oldZoom before instead of 0
    odGeoBandwidth = odGeoLine.bandwidth();
}

function updateGeoLine(scale) {
    /*odGeoLine = d3.scaleBand()
        .domain(idArray)
        .range([0, midBottomContainerBox.height * scale]);*/
    //odGeoLine = d3.scaleBand();
    //odGeoLine.domain(idArray);
    odGeoLine.range([0, midBottomContainerBox.height * scale]);
}

function displayGeoLine(newY) {
    const reducedDomain = getReducedDomain(odGeoLine);
    d3.selectAll('.geoLine *').remove();
    if (newY) {
        d3.selectAll('.geoLine').style('transform', 'translateY(' + newY + 'px)');
    }
    const halfBandwidth = odGeoLine.bandwidth()/2;
    const halfFontSize = oddataFontSize/2;
    const offset = halfBandwidth - halfFontSize;
    for (let areaText of reducedDomain) {
        const top = odGeoLine(areaText) + offset;
        const obj = oddataObject[areaText];
        originContainer.append('text')
            .attr('class', 'originText')
            .text(obj['origin'])
            .style('top', top + 'px')
            .style('font-size', oddataFontSize + 'px')
            .style('fill', 'black');
        destinationContainer.append('text')
            .attr('class', 'destinationText')
            .text(obj['destination'])
            .style('top', top + 'px')
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
    canvas.append('g').selectAll('.rect').data(oddataArray).join(
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
    const canvasBottom = canvas.node().getBoundingClientRect().bottom;
    const tooltipHeight = odTooltip.node().getBoundingClientRect().height;
    odTooltip.attr('id', 'odTooltip')
        .style('top', (((canvasBottom - bbox.bottom) < tooltipHeight) ? bbox.top : bbox.bottom) + 'px')
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

/*const odTimeZoom = addODTimeZoom();
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
                //updateTimeline();
                //displayTimeline();
                odTimeScale = newScale;
                const newTimeline = createTimeline();
                d3.selectAll('.odTimeText').remove();
                displayTimeline(newTimeline);
                checkODTimeDisplay();
            }
        })
        .filter((event) => { return event.shiftKey });
}*/

d3.select('#bottomFit').on('click', () => {
    /*canvas.transition().duration(fitDuration).call(
        odZoom.transform,
        d3.zoomIdentity
    );*/
    oddeck.setProps({
        initialViewState: {
            target: [canvas.attr('width') / 2, canvas.attr('height') / 2, 0],
            zoom: 0,
            minZoom: 0,
            transitionDuration: fitDuration,
            transitionEasing: d3.easeLinear,
            transitionInterpolator: new LinearInterpolator({transitionProps: ['target', 'zoom']})
        }
    });
});