//const ogDataUrl = '../../data/populationReallySmall.csv';
//const ogDataUrl = '../../data/populationSmall.csv';
//const ogDataUrl = '../../data/populationSmall2.csv';
const ogDataUrl = '../../data/population.csv';

const oddataObject = {};
const oddataArray = [];

let hasYear;
let hasMonth;
let hasDay;

let odGeoLine;
let odTimeline;

let odZoom;

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
    d3.selectAll('.geoLine').style('width', 5.5 * maxLength + 'px');
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
    createDeck();
    canvas.on('mouseleave', () => {
        hoveredId = '';
        oddeck.setProps({layers: [createPolygonLayer()]});
    });

    odZoom = addODZoom();
    canvas.call(odZoom);
});

let odScale = 1;
function addODZoom() {
    return d3.zoom()
        .on('zoom', (event) => {
            let newScale = event.transform.k;
            if (newScale !== odScale) {
                odScale = newScale;
                //d3.select('.odRect.hovered').attr('stroke-width', 2 / odScale);
                /*createGeoLine();
                displayGeoLine();
                createTimeline();
                displayTimeline();*/
            }
            /*odTooltip.attr('id', 'odTooltip').style('display', 'none');
            d3.selectAll('.geoLine').style('transform', 'translateY(' + event.transform.y + 'px)');
            d3.select('#bottomTimeLine').style('transform', 'translateX(' + event.transform.x + 'px)')
            checkODTimeDisplay();*/
        })
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0],[canvas.attr('width'), canvas.attr('height')]]);
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

const { DeckGL, OrthographicView, LinearInterpolator, COORDINATE_SYSTEM, PolygonLayer } = deck;
let oddeck;
let crtViewState;
let hoveredId = '';
let polygonLayer = createPolygonLayer();

function createPolygonLayer() {
    return new PolygonLayer({
        id: 'polygon-layer',
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: oddataArray,
        pickable: true,
        stroked: true,
        getPolygon: d => d.outline,
        getFillColor: getFillColor,
        lineWidthUnits: 'pixels',
        getLineColor: getLineColor,
        /*onHover: (info) => {
            if (info.object) {
                const obj = info.object;
                const id = obj.id + obj.date;
                if (id !== hoveredId) {
                    hoveredId = id;
                    oddeck.setProps({layers: [createPolygonLayer()]});
                }
            }
        },
        updateTriggers: {
            getLineColor: [hoveredId]
        }*/
    });
}

const throttledStateChange = _.throttle(updateViewState, 100, {leading: false});

function updateViewState(viewState, zoom) {
    console.log('in throttle');
    if (zoom !== oldZoom) {
        oldZoom = zoom;
        createGeoLine();
        displayGeoLine();
        createTimeline();
        displayTimeline();
        checkODTimeDisplay();
    }
    const scale = Math.pow(2, zoom);
    const translateY = ((scale - 1) * canvasHeight) / 2 + (viewState.target[1] - canvasHeight / 2) * scale;
    const translateX = ((scale - 1) * canvasWidth) / 2 + (viewState.target[0] - canvasWidth / 2) * scale;
    d3.selectAll('.geoLine').style('transform', 'translateY(-' + translateY + 'px)');
    d3.select('#bottomTimeLine').style('transform', 'translateX(-' + translateX + 'px)');
    //return viewState;
}

let oldZoom = 0;
function createDeck() {
    crtViewState = {
        target: [canvas.attr('width') / 2, canvas.attr('height') / 2, 0],
        zoom: 0,
        minZoom: 0,
        maxZoom: Infinity
    };
    oddeck = new DeckGL({
        useDevicePixels: false,
        container: 'midBottomCanvas',
        views: new OrthographicView({
            controller: {
                scrollZoom: {speed: 0.005}
            }
        }),
        initialViewState: crtViewState,
        /*onViewStateChange: ({viewState}) => {
            //console.log(oddeck);
            const zoom = viewState.zoom;
            const target = viewState.target;
            let scale = Math.pow(2, zoom + 1);
            const widthMargin = canvasWidth / scale;
            const heightMargin = canvasHeight / scale;
            viewState.target = [Math.min(Math.max(target[0], widthMargin), canvasWidth - widthMargin), Math.min(Math.max(target[1], heightMargin), canvasHeight - heightMargin), 0];
            return viewState;
            //throttledStateChange(viewState, zoom);
            //console.log('after throttle');
            //return viewState;
        },*/
        layers: [polygonLayer]
    });
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
        .range([0, d3.select('#bottomTimeLine').node().getBoundingClientRect().width * Math.pow(2, oldZoom)]);
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
    /*odGeoLine = d3.scaleBand()
        .domain(idArray)
        .range([0, d3.select('#midBottomContainer').node().getBoundingClientRect().height * odScale]);*/
    odGeoLine = d3.scaleBand()
        .domain(idArray)
        //.range([0, d3.select('#midBottomContainer').node().getBoundingClientRect().height * Math.pow(2, oldZoom)]);
        .range([0, midBottomContainerBox.height * Math.pow(2, oldZoom)]);
}

function displayGeoLine() {
    const reducedDomain = getReducedDomain(odGeoLine);
    d3.selectAll('.geoLine *').remove();
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