/* General properties */

const geoNameMaxPercentage = 8;             // Max width percentage (wrt middle part) for geographic names display for graphics

const datasetGraphicRatio = 41/100;         // Percentage of document height dedicated to a PIXI graphic
const midPaneWidthRatio = 0.5;              // Percentage of document width dedicated to the middle part (graphics)

const pointRadius = 3/2;                    // Radius used to display small white area points on maps
const pointOriColor = 'white';              // Original area point color
const pointSelColor = 'black';              // Selected area point color

const nameOriFontSize = 10;                 // Original area name font size
const nameOriFontColor = 'white';           // Original area name font color
const nameSelFontColor = 'black';           // Selected area name font color
const nameOriFontWeight = 'normal';         // Original area name font weight
const nameSelFontWeight = 900;              // Selected area name font weight
const nameFontSizeMult = 4/3;               // Selected/hovered area name font size multiplier

const pathOriStrokeSize = 1/4;              // Original area path stroke size
const pathOriStrokeColor = 'lightskyblue';  // Original area path stroke color
const pathSelStrokeColor = 'black';         // Selected area path stroke color
const pathOriFillColor = 'dimgrey';         // Original area path fill color
const pathSelFillColor = '#404040';         // Selected area path fill color
const pathStrokeSizeMult = 5;               // Hovered area path stroke size multiplier

const rectClickedLineColor = '0x000000';    // Border color of clicked data rectangle
const rectClickedLineWidth = 2;             // Border size of clicked data rectangle

const rectRoundedCornerRatio = 1/10;        // Ratio (rounded corner / height) for generated rectangle area paths
const rectWidthHeightRatio = 3;             // Ratio (width / height) for generated rectangle area paths

const spaceScaleTime = 3;                   // Time space multiplier for timeline display
const spaceScaleGeo = 2;                    // Geo space multiplier for geoline display

const timeHeightMargin = 5                  // Margin used for timeline display

const fitDuration = 1500;                   // Duration in milliseconds for animation (fit buttons)
const fractionDigits = 5;                   // Number of digits to be saved after comma (used to obtain always same scale values (k))

const dataFontSize = 10;                    // Font size to display geo names, information, ...
const dataBackgroundColor = 0x404040;       // BackgroundColor for Data graphics

const areaHoverColorTimeout = 200;          // Timeout in milliseconds to wait before displaying area colors on maps corresponding to OD data


//const questionsTimerDuration = 600;         // Timer duration (seconds) for each part of evaluation flowstratesplus
const questionsTimerDuration = 5;

const qualitativeRadioGroups = ['AorBq1', 'AorBq2', 'AorBq3', 'verAq1', 'verAq2', 'verAq3', 'verBq1', 'verBq2', 'verBq3'];

const logServerAddress = 'http://localhost:8080';

/* Creates a pixelated font for high performance display */
const specialChars = '.·&(){}[]ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöùúûüýÿ ';    // PIXI special useful characters
const PIXI_CHARS = [['a','z'], ['A','Z'], specialChars];                                    // PIXI used characters
const PIXI_STYLE = new PIXI.TextStyle({                                                     // PIXI text style (use to compute displayed text length)
    fill: 0x000000,
    fontSize: dataFontSize,
    fontFamily: 'Helvetica'
});
PIXI.BitmapFont.from('helvetica', PIXI_STYLE, {chars: PIXI_CHARS});                         // PIXI bitmapFont (used for quick text rendering on graphics)

const odColorInterpolator = d3.interpolateOrRd;                                             // Original OD data d3 colorScale
const differenceColorInterpolators = [d3.interpolateBlues, d3.interpolateReds];             // Difference OD data d3 colorScales [negColorScale, posColorScale]
const altColorInterpolators = [d3.interpolatePuBu, d3.interpolateYlGn];                     // Original Alt data d3 colorScales [colorScale dataset1, colorScale dataset2]


/* Files urls */
const areaLPathsUrl = '../../../data/areaPaths.json';                                       // Fixed left map area paths file
const areaRPathsUrl = areaLPathsUrl;                                                        // Fixed right map area paths file
const areaLNodesUrl = '../../../data/areaNodes.csv';                                        // Fixed left map area nodes file
const areaRNodesUrl = areaLNodesUrl;                                                        // Fixed right map area nodes file
const areaLShapesUrl = '../../../data/areaShapes.csv';                                      // Fixed left map area shapes file
const areaRShapesUrl = areaLShapesUrl;                                                      // Fixed right map area shapes file

const odDataUrl = '../../../data/Refugees.csv';                                             // Fixed OD dataset url
//const altDataUrls = ['../../../data/Disasters2.csv','../../../data/Temperatures.csv'];    // Fixed Alt dataset urls
const altDataUrls = ['../../../data/WarDeaths.csv','../../../data/Temperatures.csv'];       // Fixed Alt dataset urls

const isODMeanChecked = false;                                                              // Fixed OD dataset mean checkbox value
const isAltMeanChecked = [false, true];                                                     // Fixed Alt dataset mean checkbox values