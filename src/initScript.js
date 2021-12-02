(async function init() {
    initMap();
})();

function initMap() {
    d3.select('#leftLoading').transition().duration(1000).style('opacity', 1)
        .on('start', function () {
            d3.select(this).style('display', 'block');
            d3.select('#rightLoading').transition().duration(1000).style('opacity', 1)
                .on('start', function () {
                    d3.select(this).style('display', 'block');
                })
                .on('end', async () => {
                    const areaLNodesOutput = await d3.csv(areaLNodesUrl);
                    const areaRNodesOutput = await d3.csv(areaRNodesUrl);
                    addModeNotificationHandlers();
                    if (areaLShapesUrl) {
                        const areaLShapesOutput = await d3.csv(areaLShapesUrl);
                        await initSideMap('left', areaLPathsUrl, areaLNodesOutput, areaLShapesOutput);
                    } else {
                        await initSideMap('left', areaLPathsUrl, areaLNodesOutput);
                    }
                    if (areaRShapesUrl) {
                        const areaRShapesOutput = await d3.csv(areaRShapesUrl);
                        await initSideMap('right', areaRPathsUrl, areaRNodesOutput, areaRShapesOutput);
                    } else {
                        await initSideMap('right', areaRPathsUrl, areaRNodesOutput);
                    }


                    const odDataOutput = await d3.csv(odDataUrl);
                    const altDataOutputs = [];
                    for (const altDataUrl of altDataUrls) {
                        altDataOutputs.push(await d3.csv(altDataUrl));
                    }

                    initODData(odDataOutput);
                    initAltData(altDataOutputs);
                });
        })
}

async function initSideMap(side, areaPathsUrl, areaNodesOutput, areaShapesOutput) {
    const areaPathsOutput = await d3.json(areaPathsUrl);
    const svg = sideElts[side].svg;
    let projection = d3.geoMercator().fitSize([svg.node().getBoundingClientRect().width, svg.node().getBoundingClientRect().height], areaPathsOutput);
    sideElts[side].projection = projection;
    sideElts[side].pathGenerator = d3.geoPath().projection(projection);
    addMap(side, areaPathsOutput, areaNodesOutput, areaShapesOutput);
}

function initODData(odDataOutput) {
    addODMap(odDataOutput);
}

function initAltData(altDataOutputs) {
    addAltMap(altDataOutputs);
}

