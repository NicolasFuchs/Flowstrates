let maxTimeLength = -Infinity;
let maxGeoLength;
let odMaxGeoLength = -Infinity;
let altMaxGeoLength = -Infinity;

let areaLPathsOutput;
let areaRPathsOutput;
let areaLNodesOutput;
let areaRNodesOutput;
let areaLShapesOutput;
let areaRShapesOutput;

const odExistingOriginIds = [];

const odData = {
    data: {},
    globalData: {
        original: {},
        difference: {}
    }
};
let altData = {
    data: {},
    globalData: [],
    dataColumnNames: []
};

const datasetNames = [];

let sortSetValue;

(async function init() {
    d3.selectAll('.settingsButtonContainer').style('pointer-events', 'none');
    d3.selectAll('.loading').classed('fadeIn', true).classed('fadeOut', false);

    addModeNotificationHandlers();

    areaLPathsOutput = await d3.json(areaLPathsUrl);
    areaRPathsOutput = await d3.json(areaRPathsUrl);
    areaLNodesOutput = await d3.csv(areaLNodesUrl);
    areaRNodesOutput = await d3.csv(areaRNodesUrl);
    if (areaLShapesUrl) areaLShapesOutput = await d3.csv(areaLShapesUrl);
    if (areaRShapesUrl) areaRShapesOutput = await d3.csv(areaRShapesUrl);

    initSideMap('left', areaLPathsOutput, areaLNodesOutput, areaLShapesOutput);
    initSideMap('right', areaRPathsOutput, areaRNodesOutput, areaRShapesOutput);

    d3.selectAll('#leftLoading, #rightLoading').classed('fadeOut', true).classed('fadeIn', false);
    setTimeout(async () => {
        createMap('left', areaLPathsOutput, areaLNodesOutput, sideElts['left'].areaShapesDefault);
        createMap('right', areaRPathsOutput, areaRNodesOutput, sideElts['right'].areaShapesDefault);

        const odDataOutput = await d3.csv(odDataUrl);
        d3.select('#odLegendTitle').html(getFileName(odDataUrl));
        const altDataOutputs = [];
        for (let i = 0; i < altDataUrls.length; i++) {
            const altDataUrl = altDataUrls[i];
            const fileName = getFileName(altDataUrl);
            addSelectSortOption(fileName, i);
            datasetNames.push(fileName);
            altDataOutputs.push({filename: fileName, data: await d3.csv(altDataUrl), index: i});
        }
        isAltLocalColorScale = Array(datasetNames.length).fill(true);

        filterODData(odDataOutput);
        generateCompleteTimeData();
        for (const altDataOutput of altDataOutputs) {
            filterAltData(altDataOutput.data, altDataOutput.index);
        }
        for (const id in altData.data) {
            for (let i = 0; i < altData.data[id].datasets.length; i++) {
                const isDatasetOriginalEmpty = _.isEmpty(altData.data[id].datasets[i]?.original?.data?.total || {});
                const isDatasetDifferenceEmpty = _.isEmpty(altData.data[id].datasets[i]?.difference?.data?.total || {});
                if (isDatasetOriginalEmpty) altData.data[id].datasets[i].original = {};
                if (isDatasetDifferenceEmpty) altData.data[id].datasets[i].difference = {};
            }
        }

        sortSetValue = sortSelect.property('value');
        altDataObject = altData;
        altIdArray = Object.keys(altData.data);
        altDataArray = Object.values(altData.data);

        maxGeoLength = Math.min(odMaxGeoLength, altMaxGeoLength, document.body.clientWidth * midPaneWidthRatio / geoNameMaxPercentage);

        applyODStyles(maxTimeLength, maxGeoLength);
        applyAltStyles(maxTimeLength, maxGeoLength);
        applyComparedStyles(maxGeoLength);
        addComparedMap();

        for (const altDataOutput of altDataOutputs) {
            createAltLegend(altDataOutput.filename, altDataOutput.index);
        }

        addAltLegendCheckboxHandler();

        d3.select('#midLoading').classed('fadeOut', true).classed('fadeIn', false);
        setTimeout(() => {
            addODMap();
            addAltMap();

            addODSettingsButtonHandlers();
            addAltSettingsButtonHandlers();
            addDataCenterButtonHandlers();

            d3.selectAll('.settingsButtonContainer').style('pointer-events', 'auto');
            createDeck();

            questionsLogo.node().click();
        }, 1000);
    }, 1000);
})();

function initSideMap(side, areaPathsOutput, areaNodesOutput, areaShapesOutput) {
    const svg = sideElts[side].svg;
    let projection = d3.geoMercator().fitSize([svg.node().getBoundingClientRect().width, svg.node().getBoundingClientRect().height], areaPathsOutput);
    sideElts[side].projection = projection;
    sideElts[side].pathGenerator = d3.geoPath().projection(projection);
    addMap(side, areaPathsOutput, areaNodesOutput, areaShapesOutput);
}

let odHasYear;
let odHasMonth;
let odHasDay;
let altHasYear;
let altHasMonth;
let altHasDay;

let odMinDate;
let odMaxDate;

function filterODData(odDataOutput) {
    const allDataColumns = odDataOutput.columns;

    odHasYear = allDataColumns.includes('Year');
    odHasMonth = allDataColumns.includes('Month');
    odHasDay = allDataColumns.includes('Day');

    if (!odHasYear && !odHasMonth && !odHasDay || odHasYear && !odHasMonth && odHasDay) {
        console.error('Date format for OD Data is incorrect !');
        return;
    }
    if (!allDataColumns.includes('OriginCode') || !allDataColumns.includes('DestinationCode')) {
        console.error('The following data fields are mandatory : OriginCode and DestinationCode');
        return;
    }

    let globalOriginalMinValue = Infinity;
    let globalOriginalMaxValue = -Infinity;
    let globalDifferenceMinValue = Infinity;
    let globalDifferenceMaxValue = -Infinity;
    
    const datasetIds = new Set();
    
    const nameIdObject = {};
    const dataColumnNames = allDataColumns.filter(c => c.endsWith('Data')).map(c => c.slice(0,-4));
    odData.dataColumnNames = dataColumnNames;
    
    for (const oddata of odDataOutput) {
        const id = oddata['OriginCode'] + '_' + oddata['DestinationCode'];
        datasetIds.add(id);
        if (!nameIdObject.hasOwnProperty(id)) {
            odExistingOriginIds.push(removeLastDigits(oddata['OriginCode']));
            const origin = oddata['SpecialOrigin'] || sideElts['left'].areaData[removeLastDigits(oddata['OriginCode'])]?.['Name'] || 'Unknown';
            const destination = oddata['SpecialDestination'] || sideElts['right'].areaData[removeLastDigits(oddata['DestinationCode'])]?.['Name'] || 'Unknown';
            nameIdObject[id] = {
                originCode: oddata['OriginCode'],
                destinationCode: oddata['DestinationCode'],
                origin: origin,
                destination: destination
            };
            odMaxGeoLength = Math.max(odMaxGeoLength, PIXI.TextMetrics.measureText(origin, PIXI_STYLE).width, PIXI.TextMetrics.measureText(destination, PIXI_STYLE).width);
        }
    }
    for (const datasetId of datasetIds) {
        if (!odData.data.hasOwnProperty(datasetId)) {
            const newOriginalDataObject = Object.fromEntries([...dataColumnNames, 'total'].map(c => [c,{}]));
            odData.data[datasetId] = {
                id: datasetId,
                originCode: nameIdObject[datasetId].originCode,
                destinationCode: nameIdObject[datasetId].destinationCode,
                origin: nameIdObject[datasetId].origin,
                destination: nameIdObject[datasetId].destination,
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

    for (const oddata of odDataOutput) {
        const formattedDate = formatDate(odHasYear, odHasMonth, odHasDay, oddata);
        if (!odMinDate || formattedDate < odMinDate) odMinDate = formattedDate;
        if (!odMaxDate || formattedDate > odMaxDate) odMaxDate = formattedDate;
        
        const id = oddata['OriginCode'] + '_' + oddata['DestinationCode'];
        let crtVal = 0;
        for (const column of dataColumnNames) {
            const columnVal = parseFloat(oddata[`${column}Data`]);
            if (columnVal) {
                crtVal += columnVal;
                odData.data[id].original.data[column][formattedDate] = columnVal;
            }
        }
        odData.data[id].original.data.total[formattedDate] = crtVal;
        odData.data[id].original.minValue = Math.min(odData.data[id].original.minValue, crtVal);
        odData.data[id].original.maxValue = Math.max(odData.data[id].original.maxValue, crtVal);
        odData.data[id].original.avgValue = odData.data[id].original.avgValue + crtVal;
        globalOriginalMinValue = Math.min(globalOriginalMinValue, odData.data[id].original.minValue);
        globalOriginalMaxValue = Math.max(globalOriginalMaxValue, odData.data[id].original.maxValue);

        maxTimeLength = Math.max(maxTimeLength, PIXI.TextMetrics.measureText(formattedDate, PIXI_STYLE).width);
    }

    for (const id in odData.data) {
        if (_.isEmpty(odData.data[id].original.data.total)) {
            delete odData.data[id]; continue;
        }
        odData.data[id].original.avgValue = odData.data[id].original.avgValue / Object.keys(odData.data[id].original.data.total).length;
        odData.data[id].original.colorScale = d3.scaleSequential()
                                                .domain([odData.data[id].original.minValue, odData.data[id].original.maxValue])
                                                .interpolator(odColorInterpolator);
                                                
        for (const key in odData.data[id].original.data) {
            const dataKey = odData.data[id].original.data[key];
            for (const date in dataKey) {
                const diff = dataKey[date] - dataKey?.[parseInt(date)-1];
                if (!isNaN(diff)) {
                    odData.data[id].difference.data[key][date] = diff;
                    if (key === 'total') {
                        odData.data[id].difference.minValue = Math.min(odData.data[id].difference.minValue, diff);
                        odData.data[id].difference.maxValue = Math.max(odData.data[id].difference.maxValue, diff);
                        odData.data[id].difference.avgValue = odData.data[id].difference.avgValue + diff;
                        globalDifferenceMinValue = Math.min(globalDifferenceMinValue, odData.data[id].difference.minValue);
                        globalDifferenceMaxValue = Math.max(globalDifferenceMaxValue, odData.data[id].difference.maxValue);
                    }
                }
            }
        }
    }

    for (const id in odData.data) {
        odData.data[id].difference.avgValue = odData.data[id].difference.avgValue / Object.keys(odData.data[id].difference.data.total).length;
        const negColorScale = d3.scaleSequential()
                                .domain([0, Math.min(0, odData.data[id].difference.minValue)])
                                .interpolator(differenceColorInterpolators[0]);
        const posColorScale = d3.scaleSequential()
                                .domain([0, Math.max(0, odData.data[id].difference.maxValue)])
                                .interpolator(differenceColorInterpolators[1]);
        odData.data[id].difference.colorScale = [negColorScale, posColorScale];
    }

    odData.globalData.original.minValue = globalOriginalMinValue;
    odData.globalData.original.maxValue = globalOriginalMaxValue;
    odData.globalData.original.colorScale = d3.scaleSequential().domain([globalOriginalMinValue, globalOriginalMaxValue]).interpolator(odColorInterpolator);
    odData.globalData.difference.minValue = globalDifferenceMinValue;
    odData.globalData.difference.maxValue = globalDifferenceMaxValue;
    const negColorScale = d3.scaleSequential().domain([0, Math.min(0, globalDifferenceMinValue)]).interpolator(differenceColorInterpolators[0]);
    const posColorScale = d3.scaleSequential().domain([0, Math.max(0, globalDifferenceMaxValue)]).interpolator(differenceColorInterpolators[1]);
    odData.globalData.difference.colorScale = [negColorScale, posColorScale];

    odIdArray = Object.keys(odData.data);
    odDataArray = Object.values(odData.data);
    odDataObject = odData;
}

function filterAltData(altDataOutput, index) {
    const allDataColumns = altDataOutput.columns;

    altHasYear = allDataColumns.includes('Year');
    altHasMonth = allDataColumns.includes('Month');
    altHasDay = allDataColumns.includes('Day');

    if (!altHasYear && !altHasMonth && !altHasDay || altHasYear && !altHasMonth && altHasDay ||
        odHasDay && !altHasDay || odHasMonth && !altHasMonth || odHasYear && !altHasYear) {
        console.error('Date format for Alt Data is incorrect !');
        return;
    }
    if (!allDataColumns.includes('Geocode')) {
        console.error('The following data field is mandatory : Geocode');
        return;
    }

    let globalOriginalMinValue = Infinity;
    let globalOriginalMaxValue = -Infinity;
    let globalDifferenceMinValue = Infinity;
    let globalDifferenceMaxValue = -Infinity;

    const datasetIds = new Set();

    let selectedFormatDate;
    if (odHasDay) selectedFormatDate = (altdata) => formatDate(altHasYear, altHasMonth, altHasDay, altdata);
    else if (odHasMonth) selectedFormatDate = (altdata) => formatDate(altHasYear, altHasMonth, false, altdata);
    else if (odHasYear) selectedFormatDate = (altdata) => formatDate(altHasYear, false, false, altdata);

    const nameIdObject = {};
    const dataColumnNames = allDataColumns.filter(c => c.endsWith('Data')).map(c => c.slice(0,-4));
    altData.dataColumnNames.push(dataColumnNames);

    for (const altdata of altDataOutput) {
        const geocode = altdata['Geocode'];
        datasetIds.add(geocode);
        if (!nameIdObject.hasOwnProperty(geocode)) {
            const geoName = altdata['SpecialGeo'] || sideElts['left'].areaData[removeLastDigits(geocode)]?.['Name'] || 'Unknown';
            nameIdObject[geocode] = geoName;
            altMaxGeoLength = Math.max(altMaxGeoLength, PIXI.TextMetrics.measureText(geoName, PIXI_STYLE).width);
        }
    }
    for (const datasetId of datasetIds) {
        if (!altData.data.hasOwnProperty(datasetId)) {
            altData.data[datasetId] = {
                id: datasetId,
                geo: nameIdObject[datasetId],
                geoCode: datasetId,
                datasets: Array(index).fill({})
            };
        }
        const newOriginalDataObject = Object.fromEntries([...dataColumnNames, 'total'].map(c => [c, Object.fromEntries(timeValues.map(t => [t, []]))]));
        altData.data[datasetId].datasets.push({
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
        });
    }

    for (const altdata of altDataOutput) {
        const formattedDate = selectedFormatDate(altdata);
        const id = altdata['Geocode'];
        const newDatasetOriginalData = altData.data[id].datasets[index].original.data;
        if (formattedDate < odMinDate || formattedDate > odMaxDate) continue;
        for (const column of dataColumnNames) {
            const columnVal = parseFloat(altdata[`${column}Data`]);
            if (columnVal) {
                newDatasetOriginalData[column][formattedDate].push(columnVal);
                newDatasetOriginalData.total[formattedDate].push(columnVal);
            }
        }
    }

    for (const id of datasetIds) {
        if (!odExistingOriginIds.includes(removeLastDigits(id))) {
            delete altData.data[id];
            datasetIds.delete(id);
            continue;
        }
        const originalData = altData.data[id].datasets[index].original.data;
        for (const key in originalData) {
            for (const date in originalData[key]) {
                const dateArray = originalData[key][date];
                if (_.isEmpty(dateArray)) delete originalData[key][date];
                else originalData[key][date] = isAltMeanChecked[index] ? d3.mean(dateArray) : d3.sum(dateArray);
            }
        }
    }

    for (const id of datasetIds) {
        const original = altData.data[id].datasets[index].original;
        const objectValues = Object.values(original.data.total);
        const extent = d3.extent(objectValues);
        original.minValue = extent[0];
        original.maxValue = extent[1];
        original.avgValue = d3.mean(objectValues);
        original.colorScale = d3.scaleSequential().domain([extent[0], extent[1]]).interpolator(altColorInterpolators[index]);
        globalOriginalMinValue = Math.min(globalOriginalMinValue, extent[0] || Infinity);
        globalOriginalMaxValue = Math.max(globalOriginalMaxValue, extent[1] || -Infinity);

        const difference = altData.data[id].datasets[index].difference;
        //for (const key in original.data) {
            //const dataKey = original.data[key];
        for (const key in difference.data) {          //TODO test
            const dataKey = difference.data[key];     //TODO test
            for (const date in dataKey) {
                //const diff = dataKey[date] - dataKey?.[parseInt(date)-1];
                const diff = original.data[key]?.[date] - original.data[key]?.[parseInt(date)-1];   //TODO test
                if (!isNaN(diff)) {
                    difference.data[key][date] = diff;
                    if (key === 'total') {
                        difference.minValue = Math.min(difference.minValue, diff);
                        difference.maxValue = Math.max(difference.maxValue, diff);
                        difference.avgValue = difference.avgValue + diff;
                        globalDifferenceMinValue = Math.min(globalDifferenceMinValue, difference.minValue);
                        globalDifferenceMaxValue = Math.max(globalDifferenceMaxValue, difference.maxValue);
                    }
                } else {
                    delete difference.data[key][date];  //TODO test
                }
            }
        }
    }

    for (const id of datasetIds) {
        const difference = altData.data[id].datasets[index].difference;
        difference.avgValue = difference.avgValue / Object.keys(difference.data.total).length;
        const negColorScale = d3.scaleSequential()
                                .domain([0, Math.min(0, difference.minValue)])
                                .interpolator(differenceColorInterpolators[0]);
        const posColorScale = d3.scaleSequential()
                                .domain([0, Math.max(0, difference.maxValue)])
                                .interpolator(differenceColorInterpolators[1]);
        difference.colorScale = [negColorScale, posColorScale];
    }

    altData.globalData.push({original: {}, difference: {}});
    altData.globalData[index].original.minValue = globalOriginalMinValue;
    altData.globalData[index].original.maxValue = globalOriginalMaxValue;
    altData.globalData[index].original.colorScale = d3.scaleSequential().domain([globalOriginalMinValue, globalOriginalMaxValue]).interpolator(altColorInterpolators[index]);
    altData.globalData[index].difference.minValue = globalDifferenceMinValue;
    altData.globalData[index].difference.maxValue = globalDifferenceMaxValue;

    const negColorScale = d3.scaleSequential().domain([0, Math.min(0, globalDifferenceMinValue)]).interpolator(differenceColorInterpolators[0]);
    const posColorScale = d3.scaleSequential().domain([0, Math.max(0, globalDifferenceMaxValue)]).interpolator(differenceColorInterpolators[1]);
    altData.globalData[index].difference.colorScale = [negColorScale, posColorScale];
}

function generateCompleteTimeData() {
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
        timeValues = d3.timeDays(start, end, 1).map(setFormat);
    }
    if (odHasMonth) {
        start.setMonth(start.getMonth() - 1);
        timeValues = d3.timeMonths(start, end, 1).map(setFormat);
    }
    if (odHasYear) {
        start.setFullYear(start.getFullYear() - 1);
        timeValues = d3.timeYears(start, end, 1).map(setFormat);
    }
}

const altLegendContainer = d3.select('#altLegendContainer');
const altLegendsContainer = d3.select('#altLegendsContainer');

function createAltLegend(fileName, index) {
    const legendString = `
    <div id="altLegend${index}" class="legend altLegend" style="height: ${altLegendsContainer.node().getBoundingClientRect().height / 2}px">
        <b id="altLegendTitle${index}" class="legendTitle">${fileName}</b>
        <div id="altLegendCheckbox${index}" class="altLegendCheckbox checkmarkLabel clicked">
            <div class="checkmark">
                <img src="../../../media/checkmark.png" alt="">
            </div>
            <text>Local colorScale</text>
        </div>
        <div class="legendStatContainer">
            <div id="altStat${index}Color0" class="statColor"></div><text id="altStat${index}Text0" class="statText"></text>
            <div id="altStat${index}Color1" class="statColor"></div><text id="altStat${index}Text1" class="statText"></text>
            <div id="altStat${index}Color2" class="statColor"></div><text id="altStat${index}Text2" class="statText"></text>
            <div id="altStat${index}Color3" class="statColor"></div><text id="altStat${index}Text3" class="statText"></text>
            <div id="altStat${index}Color4" class="statColor"></div><text id="altStat${index}Text4" class="statText"></text>
        </div>
    </div>`;

    altLegendsContainer.node().insertAdjacentHTML('beforeend', legendString);
}

const sortSelect = d3.select('#sortSelect');

function addSelectSortOption(fileName, index) {
    const option = document.createElement('option');
    option.innerHTML = fileName;
    option.value = index;
    sortSelect.node().appendChild(option);
}