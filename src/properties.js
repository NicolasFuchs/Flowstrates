/* General properties */

let pointRadius = 3/2;
let pointOriColor = 'white';
let pointSelColor = 'black';

let nameOriFontSize = 10;
let nameOriFontColor = 'white';
let nameSelFontColor = 'black';
let nameOriFontWeight = 'normal';
let nameSelFontWeight = 900;
let nameFontSizeMult = 4/3;

let pathOriStrokeSize = 1/4;
let pathOriStrokeColor = 'lightskyblue';
let pathSelStrokeColor = 'black';
let pathOriFillColor = 'dimgrey';
let pathSelFillColor = '#404040';
let pathStrokeSizeMult = 5;

let altCategoriesHeight = 40;

let rectRoundedCornerRatio = 1/10;
let rectWidthHeightRatio = 3;

let spaceScaleTime = 3;
let spaceScaleGeo = 2;

let fitDuration = 1500;
let fractionDigits = 5;

let dataFontSize = 10;
let dataBackgroundColor = 0x404040;

/* Creates a pixelated font for high performance display */
const PIXI_CHARS = [['a','z'], ['A','Z'], ".·&(){}[]ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöùúûüýÿ "];
const PIXI_STYLE = new PIXI.TextStyle({fill: 0x000000, fontSize: dataFontSize, fontFamily: 'Helvetica'});
PIXI.BitmapFont.from('helvetica', PIXI_STYLE, {chars: PIXI_CHARS});

/* Files urls */
const areaLPathsUrl = '../../data/areaPaths.json';
const areaRPathsUrl = areaLPathsUrl;
const areaLNodesUrl = '../../data/areaNodes.csv';
const areaRNodesUrl = areaLNodesUrl;
const areaLShapesUrl = '../../data/areaShapes.csv';
const areaRShapesUrl = areaLShapesUrl;

const odDataUrls = ['../../data/populationReallySmall.csv','../../data/populationSmall.csv','../../data/populationSmall2.csv','../../data/population.csv'];
const odDataUrl = odDataUrls[3];

const altDataUrls = ['../../data/alt_temperatures_cut.csv'];