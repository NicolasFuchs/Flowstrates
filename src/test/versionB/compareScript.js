const altComparedGraphics = new PIXI.Graphics();
const odComparedGraphics = new PIXI.Graphics();
const altHighlightedComparedGraphics = new PIXI.Graphics();
const odHighlightedComparedGraphics = new PIXI.Graphics();

const comparedAltCanvas = d3.select('#comparedAltCanvas');
const comparedODCanvas = d3.select('#comparedODCanvas');

let altComparedCanvasBox;
let odComparedCanvasBox;

function applyComparedStyles(maxGeoLength) {
    const width = Math.ceil(maxGeoLength);
    const height = Math.ceil(d3.select('#comparedCanvasContainer').node().getBoundingClientRect().height/2);

    d3.select('#comparedDataContainer').style('grid-template-columns', `${width}px ${odDataContainer.node().getBoundingClientRect().width - 2 * width}px ${width}px`);
    d3.selectAll([...comparedAltCanvas, ...comparedODCanvas])
        .style('height', height + 'px')
        .style('width', '100%')
        .attr('height', height);

    d3.select('#comparedDataContainer').style('opacity', '1');

    altComparedCanvasBox = {};  //resize
    altComparedCanvasBox.top = (46/100 + 2/125) * document.body.clientHeight;
    altComparedCanvasBox.left = document.body.clientWidth / 4 + width;
    altComparedCanvasBox.height = Math.ceil(comparedAltCanvas.attr('height'));
    altComparedCanvasBox.width = Math.ceil(altDataContainer.node().getBoundingClientRect().width - 2 * width);
    altComparedCanvasBox.right = altComparedCanvasBox.left + altComparedCanvasBox.width;
    altComparedCanvasBox.bottom = altComparedCanvasBox.top + altComparedCanvasBox.height;

    odComparedCanvasBox = {};
    odComparedCanvasBox.top = altComparedCanvasBox.top + height;
    odComparedCanvasBox.left = document.body.clientWidth / 4 + width;
    odComparedCanvasBox.height = Math.ceil(comparedODCanvas.attr('height'));
    odComparedCanvasBox.width = Math.ceil(odDataContainer.node().getBoundingClientRect().width - 2 * width);
    odComparedCanvasBox.right = odComparedCanvasBox.left + odComparedCanvasBox.width;
    odComparedCanvasBox.bottom = odComparedCanvasBox.top + odComparedCanvasBox.height;
}

function addComparedMap() {
    createAltComparedGraphics();
    createODComparedGraphics();
}

let altComparedRenderer;    //resize
let odComparedRenderer;

function createAltComparedGraphics() {
    const rendererOptions = {
        width: altComparedCanvasBox.width,
        height: altComparedCanvasBox.height,
        backgroundColor: dataBackgroundColor,
        antialias: true,
        view: comparedAltCanvas.node()
    };
    //const renderer = PIXI.autoDetectRenderer(rendererOptions);
    altComparedRenderer = PIXI.autoDetectRenderer(rendererOptions);
    const stage = new PIXI.Container();

    animate();
    function animate() {
        //renderer.render(stage);
        altComparedRenderer.render(stage);
        requestAnimationFrame(animate);
    }

    //createAltComparedTooltipInteraction(renderer);
    createAltComparedTooltipInteraction(altComparedRenderer);

    stage.addChild(altComparedGraphics);
    stage.addChild(altHighlightedComparedGraphics);
}

function createODComparedGraphics() {
    const rendererOptions = {
        width: odComparedCanvasBox.width,
        height: odComparedCanvasBox.height,
        backgroundColor: dataBackgroundColor,
        antialias: true,
        view: comparedODCanvas.node()
    };
    //const renderer = PIXI.autoDetectRenderer(rendererOptions);
    odComparedRenderer = PIXI.autoDetectRenderer(rendererOptions);
    const stage = new PIXI.Container();

    animate();
    function animate() {
        //renderer.render(stage);
        odComparedRenderer.render(stage);
        requestAnimationFrame(animate);
    }

    //createODComparedTooltipInteraction(renderer);
    createODComparedTooltipInteraction(odComparedRenderer);

    stage.addChild(odComparedGraphics);
    stage.addChild(odHighlightedComparedGraphics);
}

let clickedODDataLine;
let clickedAltDataLine;
function createODComparedTooltipInteraction(renderer) {
    odHighlightedComparedGraphics.hitArea = new PIXI.Rectangle(0, 0, odComparedCanvasBox.width, odComparedCanvasBox.height);
    const interactionManager = renderer.plugins['interaction'];
    odHighlightedComparedGraphics
        .on('mousemove', (event) => {
            if (interactionManager.hitTest(event.data.global, odHighlightedComparedGraphics)) {
                const pos = event.data.getLocalPosition(odHighlightedComparedGraphics);
                const x = pos.x;

                const timeScaleBandwidth = odInitialTimeScaleBand.bandwidth();

                altHighlightedComparedGraphics.clear();
                odHighlightedComparedGraphics.clear();
                odHighlightedComparedGraphics.beginFill(0xFFFFFF, 0.0);
                odHighlightedComparedGraphics.lineStyle(1, 0x000000);
                odHighlightedComparedGraphics.drawRect(x - (x % timeScaleBandwidth), 0, timeScaleBandwidth, odComparedCanvasBox.height);

                const xIdentifier = odInitialTimeScaleBand.domain()[Math.floor(x / timeScaleBandwidth)];
                const data = clickedODDataLine.data.total[xIdentifier];
                let tooltipText = `${clickedODDataLine.origin} -> ${clickedODDataLine.destination}<br>`;
                const roundedData = tooltipRoundData(data);
                tooltipText += `${xIdentifier} : ${roundedData || '-'}<br>`;
                if (!isNaN(roundedData) && odData.dataColumnNames.length > 1) {
                    for (const columnData of odData.dataColumnNames) {
                        tooltipText += `${columnData} : ${tooltipRoundData(clickedODDataLine.data[columnData]?.[xIdentifier]) || '-'}<br>`;
                    }
                }
                tooltip.html(tooltipText);

                const globalPos = odHighlightedComparedGraphics.toGlobal(new PIXI.Point(x - (x % timeScaleBandwidth) + timeScaleBandwidth, 0));
                const gx = globalPos.x;
                tooltip.style('bottom', document.body.clientHeight - odComparedCanvasBox.bottom + 'px')
                        .style('left', odComparedCanvasBox.left + gx + 'px')
                        .style('display', 'block');

                colorODAreaOnHover(clickedODDataLine, data, xIdentifier, true);
            }
        })
        .on('mouseout', () => {
            odHighlightedComparedGraphics.clear();
            tooltip.style('display', 'none');

            clearLastODAreaHoverColor();
            lastODLeftAreaPath = undefined;
            lastODRightAreaPath = undefined;
            lastODLeftAreaPathID = undefined;
            lastODRightAreaPathID = undefined;
        });
}

function createAltComparedTooltipInteraction(renderer) {
    altHighlightedComparedGraphics.hitArea = new PIXI.Rectangle(0, 0, altComparedCanvasBox.width, altComparedCanvasBox.height);
    const interactionManager = renderer.plugins['interaction'];
    altHighlightedComparedGraphics
        .on('mousemove', (event) => {
            if (interactionManager.hitTest(event.data.global, altHighlightedComparedGraphics)) {
                const pos = event.data.getLocalPosition(altHighlightedComparedGraphics);
                const x = pos.x;

                const timeScaleBandwidth = altInitialTimeScaleBand.bandwidth();

                odHighlightedComparedGraphics.clear();
                altHighlightedComparedGraphics.clear();
                altHighlightedComparedGraphics.beginFill(0xFFFFFF, 0.0);
                altHighlightedComparedGraphics.lineStyle(1, 0x000000);
                altHighlightedComparedGraphics.drawRect(x - (x % timeScaleBandwidth), 0, timeScaleBandwidth, altComparedCanvasBox.height);

                const xIdentifier = altInitialTimeScaleBand.domain()[Math.floor(x / timeScaleBandwidth)];
                tooltip.html(`${clickedAltDataLine.geo}<br>`);
                addTooltipGrid();
                for (let i = 0; i < clickedAltDataLine.datasets.length; i++) {
                    const data = clickedAltDataLine.datasets[i]?.data?.total?.[xIdentifier];
                    let tooltipText = `${datasetNames[i]}<br>`;
                    const roundedData = tooltipRoundData(data);
                    tooltipText += `${xIdentifier} : ${roundedData || '-'}<br>`;
                    if (!isNaN(roundedData) && altDataObject.dataColumnNames[i].length > 1) {
                        for (const columnData of altDataObject.dataColumnNames[i]) {
                            tooltipText += `${columnData} : ${tooltipRoundData(clickedAltDataLine.datasets[i].data[columnData]?.[xIdentifier]) || '-'}<br>`;
                        }
                    }
                    d3.select('#tooltipGrid').node().insertAdjacentHTML('beforeend', `<div>${tooltipText}</div>`);
                }

                const globalPos = altHighlightedComparedGraphics.toGlobal(new PIXI.Point(x - (x % timeScaleBandwidth) + timeScaleBandwidth, 0));
                const gx = globalPos.x;
                tooltip.style('bottom', document.body.clientHeight - altComparedCanvasBox.bottom + 'px')
                        .style('left', altComparedCanvasBox.left + gx + 'px')
                        .style('display', 'block');
            }
        })
        .on('mouseout', () => {
            altHighlightedComparedGraphics.clear();
            tooltip.style('display', 'none');
        });
}

d3.select('#comparedCanvasContainer').on('mouseover', () => {
    if (clickedODDataLine) {
        d3.select('#odLegendCheckbox').style('opacity', 0);
        displayODLegendContent(clickedODDataLine, true);
    }
    if (clickedAltDataLine) {
        d3.selectAll('.altLegendCheckbox').style('opacity', 0);
        displayAltLegendContent(clickedAltDataLine, true);
    }
});
d3.select('#comparedCanvasContainer').on('mouseleave', () => {
    d3.selectAll('#odLegendCheckbox, .altLegendCheckbox').style('opacity', 1);
    odLegendCheckboxHandler();
    for (let i = 0; i < datasetNames.length; i++) altLegendCheckboxHandler(i);
});

function drawODComparedData() {
    odComparedGraphics.clear();
    for (const time in clickedODDataLine.data.total) {
        const data = clickedODDataLine.data.total[time];
        const colorScale = getDiffOriColorScale(clickedODDataLine.colorScale, data);
        odComparedGraphics.beginFill('0x' + d3.color(colorScale(data)).formatHex().substr(1));
        odComparedGraphics.drawRect(odInitialTimeScaleBand(time), 0, odInitialTimeScaleBand.bandwidth(), odComparedCanvasBox.height);
        odComparedGraphics.endFill();
    }
    d3.select('#comparedODCanvas').style('opacity', 1);
    odHighlightedComparedGraphics.interactive = true;
    odHighlightedComparedGraphics.buttonMode = true;
}

function drawAltComparedData() {
    altComparedGraphics.clear();
    const datasetHeight = altComparedCanvasBox.height / datasetNames.length;
    for (let i = 0; i < clickedAltDataLine.datasets.length; i++) {
        for (const time in clickedAltDataLine.datasets[i]?.data?.total) {
            const data = clickedAltDataLine.datasets[i].data.total[time];
            const colorScale = getDiffOriColorScale(clickedAltDataLine.datasets[i].colorScale, data);
            altComparedGraphics.beginFill('0x' + d3.color(colorScale(data)).formatHex().substr(1));
            altComparedGraphics.drawRect(altInitialTimeScaleBand(time), i * datasetHeight, altInitialTimeScaleBand.bandwidth(), datasetHeight);
            altComparedGraphics.endFill();
        }
    }
    d3.select('#comparedAltCanvas').style('opacity', 1);
    altHighlightedComparedGraphics.interactive = true;
    altHighlightedComparedGraphics.buttonMode = true;
}