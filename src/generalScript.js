/* Global general variables */

let sideElts;

d3.select('#linesDisplayOption').on('click', function () {
    const isClicked = !d3.select(this).classed('clicked');
    d3.select(this).classed('clicked', isClicked);
});
d3.select('#diffDisplayOption').on('click', function () {
    const isClicked = !d3.select(this).classed('clicked');
    d3.select(this).classed('clicked', isClicked);
});
d3.select('#originGroupOption').on('click', function () {
    const isClicked = resetButtonStyles('#groupButtonContainer', d3.select(this));
});
d3.select('#destinationGroupOption').on('click', function () {
    const isClicked = resetButtonStyles('#groupButtonContainer', d3.select(this));
});
d3.select('#minSortOption').on('click', function () {
    const isClicked = resetButtonStyles('#sortButtonContainer', d3.select(this));
});
d3.select('#maxSortOption').on('click', function () {
    const isClicked = resetButtonStyles('#sortButtonContainer', d3.select(this));
});
d3.select('#avgSortOption').on('click', function () {
    const isClicked = resetButtonStyles('#sortButtonContainer', d3.select(this));
});

function resetButtonStyles(containerID, button) {
    const isClicked = button.classed('clicked');
    d3.selectAll(`${containerID} .optionButton`).classed('clicked', false);
    button.classed('clicked', !isClicked);
    return !isClicked;
}

/**********************************************************************************************************************/
/* Utility functions */

/* Returns a reduced list of metric texts to display according to space available (zoom level) */
function getReducedDomain(scaleBand, spaceScale) {
    const spaceCheck = dataFontSize * spaceScale / scaleBand.bandwidth();
    let reducedDomain = scaleBand.domain();
    if (spaceCheck > 1) {
        for (let i = 0; i < Math.ceil(Math.log(spaceCheck)/Math.log(2)); i++) {
            reducedDomain = reducedDomain.filter((d, i) => i % 2 === 0);
        }
    }
    return reducedDomain;
}

