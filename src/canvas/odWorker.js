let canvas;
let context;
let oddata;
let geoBandwidth;
let timeBandwidth;

onmessage = function(event) {
    if (event.data.eventType === 'createCanvas') {
        canvas = event.data.canvas;

        canvas.width = event.data.width;
        canvas.height = event.data.height;
        const devicePixelRatio = event.data.devicePixelRatio;
        if (devicePixelRatio !== 1.0) {
            context.canvas.style.width = (context.canvas.width / devicePixelRatio) + 'px';
            context.canvas.style.height = (context.canvas.height / devicePixelRatio) + 'px';
        }

        //context = canvas.getContext('2d');
        context = canvas.getContext('2d');
    } else if (event.data.eventType === 'drawCanvas') {
        oddata = event.data.oddata;
        geoBandwidth = event.data.geoBandwidth;
        timeBandwidth = event.data.timeBandwidth;
        draw().then(() => { context.restore(); });
    } else if (event.data.eventType === 'transformCanvas') {
        context.save();
        const transform = event.data.transform;
        context.translate(transform.x, transform.y);
        context.scale(transform.k, transform.k);
    }
}

async function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    //requestAnimationFrame(() => {
        for (const rect of oddata) {
            context.fillStyle = rect.fillStyle;
            context.fillRect(rect.x, rect.y, timeBandwidth, geoBandwidth);
        }
    //});
}

