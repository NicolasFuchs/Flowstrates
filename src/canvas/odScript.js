//const ogDataUrl = '../../data/populationReallySmall.csv';
//const ogDataUrl = '../../data/populationSmall.csv';
const ogDataUrl = '../../data/populationSmall2.csv';
//const ogDataUrl = '../../data/population.csv';

const oddataObject = {};
const oddataArray = [];

let hasYear;
let hasMonth;
let hasDay;

let odGeoLine;
let odTimeline;

let odZoom;

const canvas = d3.select('#midBottomCanvas');
const context = canvas.node().getContext('2d');
/*const offCanvas = canvas.node().transferControlToOffscreen();
const worker = new Worker('odWorker.js');*/

d3.csv(ogDataUrl).then(ODData => {
    hasYear = ODData[0].hasOwnProperty('Year');
    hasMonth = ODData[0].hasOwnProperty('Month');
    hasDay = ODData[0].hasOwnProperty('Day');

    createODDataObject(ODData);

    d3.select('#midBottomContainer').style('height', d3.select('#oddataContainer').node().getBoundingClientRect().height - (oddataFontSize * 3) + 'px');
    d3.selectAll('.geoLine').style('width', 5.5 * maxLength + 'px');
    d3.select('#bottomTimeContainer').style('height', oddataFontSize * 3 + 'px');
    //canvas.on('mouseleave', () => { odTooltip.attr('id', 'odTooltip').style('display', 'none'); });

    createGeoLine();
    displayGeoLine();

    const canvasBox = canvas.node().getBoundingClientRect();
    d3.select('#bottomTimeLine').style('width', canvasBox.width + 'px');
    canvas.attr('height', canvasBox.height).attr('width', canvasBox.width);

    createTimeline();
    displayTimeline();

    addNonExistingData();

    bindData();
    draw();

    odZoom = addODZoom();
    canvas.call(odZoom);
});

let odScale = 1;
function addODZoom() {
    //let drawInterval;
    return d3.zoom()
        .on('start', (event) => {
            /*drawInterval = setInterval(() => {
                context.save();
                context.translate(event.transform.x, event.transform.y);
                context.scale(event.transform.k, event.transform.k);
                draw().then(() => { context.restore(); });
            }, 10);*/
        })
        .on('zoom', (event) => {

            context.save();
            context.translate(event.transform.x, event.transform.y);
            context.scale(event.transform.k, event.transform.k);
            draw().then(() => { context.restore(); });

            let newScale = event.transform.k;
            if (newScale !== odScale) {
                odScale = newScale;
                //d3.select('.odRect.hovered').attr('stroke-width', 2 / odScale);
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
        .on('end', () => {
            //clearInterval(drawInterval);
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

const customHolder = d3.select(document.createElement('customHolder'));
function bindData() {
    const colorScale = d3.scaleSequential().domain([0, maxDataValue]).interpolator(d3.interpolateOrRd);
    const join = customHolder.selectAll('custom.rect').data(oddataArray);
    const enter = join.enter()
        .append('custom')
        .attr('class', 'rect');
    join.merge(enter)
        .attr('width', odTimeline.bandwidth())
        .attr('height', odGeoLine.bandwidth())
        .attr('y', d => { return odGeoLine(d['id']) })
        .attr('x', d => { return odTimeline(d['date']) })
        .attr('fillStyle', d => {
            const data = d['data'];
            if (data === 'n/a') return 'grey';
            else return colorScale(d['data']);
        });
    join.exit().remove();
}

async function draw() {
    context.clearRect(0, 0, canvas.attr('width'), canvas.attr('height'));
    customHolder.selectAll('custom.rect').each(function (d, i) {
        const custom = d3.select(this);
        context.fillStyle = custom.attr('fillStyle');
        context.fillRect(custom.attr('x'), custom.attr('y'), custom.attr('width'), custom.attr('height'));
    });
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
    canvas.transition().duration(fitDuration).call(
        odZoom.transform,
        d3.zoomIdentity
    );
});