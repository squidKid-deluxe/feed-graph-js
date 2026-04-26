// THIRD PARTY LIBRARIES
// const axios = require('axios');
// const Plotly = require('plotly');

const MPAS = {
    "HONEST.CNY": "1.3.5641",
    "HONEST.USD": "1.3.5649",
    "HONEST.BTC": "1.3.5650",
    "HONEST.XAU": "1.3.5651",
    "HONEST.XAG": "1.3.5652",
    "HONEST.ETH": "1.3.5659",
    "HONEST.XRP": "1.3.5660",
    "HONEST.ETH1": "1.3.5661",
    "HONEST.XRP1": "1.3.5662",
    "HONEST.USDSHORT": "1.3.6289",
    "HONEST.BTCSHORT": "1.3.6290",
    "HONEST.ADA": "1.3.6304",
    "HONEST.DOT": "1.3.6305",
    "HONEST.LTC": "1.3.6306",
    "HONEST.SOL": "1.3.6307",
    "HONEST.XMR": "1.3.6308",
    "HONEST.ATOM": "1.3.6309",
    "HONEST.XLM": "1.3.6310",
    "HONEST.ALGO": "1.3.6311",
    "HONEST.FIL": "1.3.6312",
    "HONEST.EOS": "1.3.6313",
    "HONEST.RUB": "1.3.6314",
    "HONEST.EUR": "1.3.6315",
    "HONEST.GBP": "1.3.6316",
    "HONEST.JPY": "1.3.6317",
    "HONEST.KRW": "1.3.6318",
    "HONEST.ADASHORT": "1.3.6319",
    "HONEST.DOTSHORT": "1.3.6320",
    "HONEST.LTCSHORT": "1.3.6321",
    "HONEST.SOLSHORT": "1.3.6322",
    "HONEST.XMRSHORT": "1.3.6323",
    "HONEST.ATOMSHORT": "1.3.6324",
    "HONEST.XLMSHORT": "1.3.6325",
    "HONEST.ALGOSHORT": "1.3.6326",
    "HONEST.FILSHORT": "1.3.6327",
    "HONEST.EOSSHORT": "1.3.6328",
    "HONEST.RUBSHORT": "1.3.6329",
    "HONEST.EURSHORT": "1.3.6330",
    "HONEST.GBPSHORT": "1.3.6331",
    "HONEST.JPYSHORT": "1.3.6332",
    "HONEST.KRWSHORT": "1.3.6333",
    "HONEST.XRPSHORT": "1.3.6334",
    "HONEST.ETHSHORT": "1.3.6335",
    "HONEST.XAUSHORT": "1.3.6336",
    "HONEST.XAGSHORT": "1.3.6337",
    "HONEST.CNYSHORT": "1.3.6338",
}

var precisions = {};
var idsAndNames = {};
var cachedGraphs = new Object();
var rpc = null;
const rpcPool = new GrapheneRPCPool();
var plottables = new Array();
var searchDebounceTimer = null;


function publicNodes() {
    /**
    use these nodes for all operations
    */
    return [
        "wss://api.bitshares.dev",
        "wss://api.bts.mobi/wss",
        "wss://api.btslebin.com/ws",
        "wss://api.dex.trading",
        "wss://node.xbts.io/ws",
        "wss://btsws.roelandp.nl/ws",
        "wss://public.xbts.io/ws",
        "wss://dex.iobanker.com/ws",
        "wss://cloud.xbts.io/ws"
    ]
}

async function wssHandshake() {
    // Obtain an active GrapheneRPC instance from the pool
    const instance = await rpcPool.getActiveInstance();
    // Return the underlying WebSocket for compatibility with existing code
    return instance.ws;
}

function wssQuery(rpc, params) {
    /**
     * Send and receive websocket requests.
     */
    const query = JSON.stringify({
        method: "call",
        params: params,
        jsonrpc: "2.0",
        id: 1
    });
    rpc.send(query);
}

function break_all() {
    wssQuery = null;
    kibana = null;
}

// Define public_nodes() and from_iso_date() functions as per your implementation

async function getObjects(rpc, objectIds) {
    /**
     * Return data about objects in 1.7.x, 2.4.x, 1.3.x, etc. format.
     */
    const ret = [];
    for (let i = 0; i < objectIds.length; i += 90) {
        const response = await new Promise((resolve) => {
            rpc.onmessage = (event) => resolve(JSON.parse(event
                .data).result);
            wssQuery(rpc, ["database", "get_objects", [objectIds
                .slice(i, i + 90)
            ]]);
        });
        try {
            ret.push(...response);
        } catch {
            console.log(response);
        }
    }
    const objects = {};
    objectIds.forEach((id, idx) => {
        if (ret[idx] !== null && ret[idx] !== undefined) {
            objects[id] = ret[idx];
        }
    });
    return objects;
}

async function precision(rpc, objectId) {
    /**
     * Get asset precision.
     *
     * Args:
     *   rpc: RPC object.
     *   objectId: ID of the object.
     *
     * Returns:
     *   int: Precision of the asset.
     */
    let prec = null;
    if (precisions[objectId] != undefined) {
        while (precisions[objectId] === "waiting") {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        prec = precisions[objectId]
    } else {
        precisions[objectId] = "waiting"
        let response = await new Promise((resolve) => {
            wssQuery(rpc, ["database", "get_objects", [
                [objectId]
            ]]);
            rpc.onmessage = resolve;
        });
        try {
            response = JSON.parse(response.data).result;
        } catch {
            console.log(response);
        }
        prec = response[0] ? response[0].precision : null;
        precisions[objectId] = prec
    }
    return prec
}

function from_iso_date(date) {
    /**
     * Returns unix epoch given various formats
     */
    const strDate = String(date);
    let strp;
    try {
        strp = new Date(strDate).getTime() / 1000;
    } catch (error) {
        try {
            strp = new Date(strDate.replace('T', ' ').replace('Z', ''))
                .getTime() / 1000;
        } catch (error) {
            strp = null;
        }
    }
    return strp;
}

function to_iso_date(unix) {
    /**
     * Returns ISO 8601 datetime given unix epoch
     */
    return new Date(unix * 1000).toISOString();
}

async function settlement_price(rpc, data) {
    if (data.base && data.quote) {
        return (parseInt(data.base) / Math.pow(10, await precision(rpc,
                data.token))) /
            (parseInt(data.quote) / Math.pow(10, await precision(rpc,
                "1.3.0")));
    }
    return -1;
}

function updateProgress(page, records, percent) {
    const bar = document.getElementById("progressBarFill");
    const text = document.getElementById("progressText");
    if (bar) bar.style.width = percent + "%";
    if (text) text.textContent = `Page ${page} • ${records} records • ${percent}%`;
}

async function kibana(start, stop, tokens, searchAfter = undefined) {
    const url = `https://es.bitshares.dev/bitshares-*/_async_search`;

    const headers = {
        'Content-Type': 'application/json'
    };

    // Standard pagination using `search_after` (browser‑compatible)
    // Build request payload, optionally adding `search_after`
    const requestData = {
        sort: [{
            "block_data.block_time": {
                order: "desc",
                format: "strict_date_optional_time",
                unmapped_type: "boolean"
            }
        }, {
            _doc: {
                order: "desc",
                unmapped_type: "boolean"
            }
        }],
        track_total_hits: false,
        size: 3000,
        fields: [{
            field: "operation_history.op_object.publisher.keyword"
        }, {
            field: "operation_history.op_object.feed.settlement_price.base.amount"
        }, {
            field: "operation_history.op_object.feed.settlement_price.quote.amount"
        }, {
            field: "operation_history.op_object.feed.settlement_price.base.asset_id"
        }],
        _source: false,
        query: {
            bool: {
                must: [],
                filter: [{
                    bool: {
                        should: tokens.map(token => ({
                            bool: {
                                should: [{
                                    match: { "operation_history.op_object.feed.settlement_price.base.asset_id": token }
                                }],
                                minimum_should_match: 1
                            }
                        })),
                        minimum_should_match: 1
                    }
                }, {
                    range: {
                        "block_data.block_time": {
                            format: "strict_date_optional_time",
                            gte: to_iso_date(start),
                            lte: to_iso_date(stop)
                        }
                    }
                }]
            }
        }
    };

    if (searchAfter) {
        requestData.search_after = searchAfter;
    }

    // Perform POST request using native fetch
    let resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
    });
    let response = await resp.json();

    // If the async search is still running, poll until completion
    if (response.is_running) {
        let pollResp = await fetch(`https://es.bitshares.dev/_async_search/${response.id}?wait_for_completion_timeout=99999999s`, {
            method: 'GET',
            headers
        });
        response = await pollResp.json();
    }

    const hits = response.response.hits.hits;
    const nextSearchAfter = hits.length ? hits[hits.length - 1].sort : undefined;
    return { hits, searchAfter: nextSearchAfter };
}

async function paginate(rpc, start, stop, assets) {
    let data = [];
    let searchAfter;
    let pageCount = 0;
    const totalTimeRange = stop - start;

    while (true) {
        // Retrieve a page using search_after
        const { hits, searchAfter: nextAfter } = await kibana(start, stop, assets, searchAfter);

        if (!hits.length) break;

        const processed = hits.map(hit => {
            const hfil = Object.values(hit.fields);
            return {
                fields: {
                    quote: hfil[0][0],
                    base: hfil[1][0],
                    producer: hfil[2][0],
                    token: hfil[3][0]
                },
                sort: from_iso_date(hit.sort[0])
            };
        });

        const promises = processed.map(async entry => {
            return [entry.fields.producer, [entry.sort, await settlement_price(rpc, entry.fields), entry.fields.token]];
        });

        const result = await Promise.all(promises);
        data.push(...result);

        // Update progress
        pageCount++;
        if (data.length > 0) {
            const newest = data[0][1][0];
            const oldest = data[data.length - 1][1][0];
            const coveredRange = newest - oldest;
            const percent = Math.min(100, Math.round((coveredRange / totalTimeRange) * 100));
            updateProgress(pageCount, data.length, percent);
        }

        if (!nextAfter) break;
        searchAfter = nextAfter;
    }

    // Deduplicate by timestamp
    const seen = new Set();
    data = data.filter(entry => {
        const ts = entry[1][0];
        if (seen.has(ts)) return false;
        seen.add(ts);
        return true;
    });

    // Keep data ordered by timestamp
    data.sort((a, b) => a[1][0] - b[1][0]);

    return data;
}

async function getData(rpc, start, stop, assets, asset_names) {
    const response = await paginate(rpc, start, stop, assets);
    const data = Object.fromEntries(assets.map(asset => [asset, {}]));

    for (const hit of response) {
        if (!data[hit[1][2]][hit[0]]) {
            data[hit[1][2]][hit[0]] = [];
        }
        data[hit[1][2]][hit[0]].push(hit[1]);
    }

    lookup = {};
    const accounts = [...new Set(Object.values(data).map(k => Object.keys(k)).flat())];
    const objects = await getObjects(rpc, accounts);
    accounts.forEach(account => {
        lookup[account] = objects[account].name;
    });


    let formattedData = new Object();
    for (const asset in data) {
        asset_dx = assets.indexOf(asset)
        for (const key in data[asset]) {
            const dates = data[asset][key].map(entry => new Date(entry[0] * 1000));
            formattedData[asset_names[asset_dx] + " - " + lookup[key]] = [dates, data[asset][key]
                .map(entry => entry[1])
            ];
        }
    }

    return formattedData;
}

async function idsFromNames(rpc, names) {
    // `rpc` is ignored; we use the global rpcPool for lookups
    let ids = [];
    let required = [];
    for (const name of names) {
        if (idsAndNames[name] !== undefined) {
            while (idsAndNames[name] === "waiting") {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            ids.push(idsAndNames[name]);
        } else {
            required.push(name);
        }
    }
    for (const name of required) {
        idsAndNames[name] = "waiting";
        // Direct query via the pool (returns result array)
        const result = await rpcPool.query("database", ["lookup_asset_symbols", [[name]]]);
        const id = result[0] ? result[0].id : null;
        idsAndNames[name] = id;
        ids.push(id);
    }
    return ids;
}

async function searchAssets() {
    if (!rpc || rpc.readyState != 1) {
        rpc = await wssHandshake();
    }

    const search = document.getElementById("tokenSearch").value.toUpperCase();


    let response = await new Promise((resolve) => {
        wssQuery(rpc, ["database", "list_assets", [
            "HONEST."+search, 100
        ]]);
        rpc.onmessage = resolve;
    });
    let results = JSON.parse(response.data).result.filter(i => i.symbol.includes(search) && i.bitasset_data_id).map(i => i.symbol);

    response = await new Promise((resolve) => {
        wssQuery(rpc, ["database", "list_assets", [
            search, 100
        ]]);
        rpc.onmessage = resolve;
    });

    results.push(...JSON.parse(response.data).result.filter(i => i.symbol.includes(search) && i.bitasset_data_id).map(i => i.symbol))
    return results

}

async function dispSearch() {
    const results = await searchAssets();
    document.getElementById("searchResults").innerHTML = results.map(i => `<tr onclick="addAsset('${i}')"><td>${i}</td></tr>`).join("\n");
}

function onSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(dispSearch, 1000);
}

function addAsset(asset){
    if (!plottables.includes(asset)){
        plottables.push(asset);
    }
    document.getElementById("selectedTokens").innerHTML = plottables.map(i => `<tr onclick="deleteAsset('${i}')"><td>${i}</td></tr>`).join("\n");
}

function deleteAsset(asset){
    plottables.splice(plottables.indexOf(asset), 1);
    document.getElementById("selectedTokens").innerHTML = plottables.map(i => `<tr onclick="deleteAsset('${i}')"><td>${i}</td></tr>`).join("\n");
}

// var plotData = [];
// var start = true;

async function plot_feed() {
    const daysAgo = document.getElementById("daysAgoBox").value
    // show progress bar
    let loading = document.getElementById("loading");
    loading.style.display = "block";
    const bar = document.getElementById("progressBarFill");
    const text = document.getElementById("progressText");
    if (bar) bar.style.width = "0%";
    if (text) text.textContent = "Starting...";

    // calculate start and stop times for potential kibana requests
    const startTime = Math.floor((Date.now() / 1000) - 86400 * daysAgo);
    const stopTime = Math.floor((Date.now() / 1000));

    let plotData = [];
    let toBeGotten = [];


    plottables.reverse();
    console.log(plottables);
    // for each token the user wants to see
    for (token of plottables) {
        // if this token is cached and sufficiently far back in history
        const cached = Object.keys(cachedGraphs).filter(i => i.split(" - ")[0] == token)
        if (cached.length > 0 && Object.values(cachedGraphs).every(i => i[1] <= startTime)) {
            // use the cache
            plotData.push(...cached.map(i => cachedGraphs[i][0]));
        } else {
            // otherwise, note that we have to use RPC
            toBeGotten.push(token)
        }
    }
    console.log(toBeGotten, plotData)
    // if we have to get any RPC stuff
    if (toBeGotten.length) {
        // get an rpc handshake if needed
        if (!rpc || rpc.readyState != 1) {
            rpc = await wssHandshake();
        }
        // get all of the ids for the assets requested
        const ids = await idsFromNames(rpc, toBeGotten);
        // synchronously load asset precisions, because async websockets have not been implemented
        for (const id of ids) {
            await precision(rpc, id);
        }
        // get the required RPC data
        const data = await getData(rpc, startTime, stopTime, ids, toBeGotten);
        // format the new data into 
        const newPlotData = Object.entries(data).map(([label, values], index) => ({
            x: values[0],
            y: values[1],
            hovertemplate: "%{y} " + label + "<extra></extra>",
            mode: 'lines',
            name: label,
            line: {
                color: undefined
            }
        }));

        // cache the new data
        newPlotData.forEach(plot => {
            cachedGraphs[plot.name] = [plot, startTime]
        });

        // append new data to the plotData that was cached
        plotData.push(...newPlotData);
    }

    console.log(cachedGraphs, plotData)

    const defaultColors = [
        "#636efa", "#EF553B", "#00cc96", "#ab63fa", "#FFA15A",
        "#19d3f3", "#FF6690", "#B6E880", "#FF97FF", "#FECB52"
    ];

    const gapThreshold = 7200;

    function generateShapes(traceColors) {
        const shapes = [];
        for (let traceIdx = 0; traceIdx < plotData.length; traceIdx++) {
            const trace = plotData[traceIdx];
            const timestamps = trace.x.map(d => d.getTime() / 1000 + (d.getTimezoneOffset() * 60));
            const traceColor = traceColors[traceIdx] || defaultColors[traceIdx % defaultColors.length];
            for (let i = 1; i < timestamps.length; i++) {
                const gap = timestamps[i] - timestamps[i - 1];
                if (gap > gapThreshold) {
                    shapes.push({
                        type: 'rect',
                        x0: new Date(timestamps[i - 1] * 1000),
                        x1: new Date(timestamps[i] * 1000),
                        y0: 0,
                        y1: 0.02,
                        yref: 'paper',
                        fillcolor: traceColor,
                        opacity: 1,
                        line: { width: 0 },
                        layer: 'above'
                    });
                }
            }
        }
        return shapes;
    }

    // initialize the plotly layout
    const layout = {
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1,
            yanchor: 'top',
            bgcolor: '#000000aa',
            bordercolor: '#d8bc27',
            borderwidth: 1
        },
        hovermode: "closest",
        title: 'Token Data Plot',
        xaxis: {
            title: 'Time',
            color: "#fff",
        },
        yaxis: {
            title: 'Price',
            color: "#fff",
        },
        font: {
            family: 'Courier New, monospace',
            color: '#ffffff'
        },
plot_bgcolor: "#111111aa",
        paper_bgcolor: "#11111100",
        datarevolution: Math.random(),
    };

    // plot everything
    Plotly.react("plotlyDiv", JSON.parse(JSON.stringify(plotData)), layout, { responsive:true });

    // get colors from rendered plot and update shapes
    const chart = document.getElementById("plotlyDiv");
    setTimeout(() => {
        const traceColors = chart._fullData.map(t => t.line.color);

        const outages = [];
        for (let traceIdx = 0; traceIdx < plotData.length; traceIdx++) {
            const trace = plotData[traceIdx];
            const timestamps = trace.x.map(d => d.getTime() / 1000 + (d.getTimezoneOffset() * 60));
            if (timestamps.length > 0) {
                if (timestamps[0] > startTime + gapThreshold) {
                    outages.push({
                        start: startTime,
                        end: timestamps[0],
                        color: traceColors[traceIdx] || defaultColors[traceIdx % defaultColors.length]
                    });
                }
                for (let i = 1; i < timestamps.length; i++) {
                    const gap = timestamps[i] - timestamps[i - 1];
                    if (gap > gapThreshold) {
                        outages.push({
                            start: timestamps[i - 1],
                            end: timestamps[i],
                            color: traceColors[traceIdx] || defaultColors[traceIdx % defaultColors.length]
                        });
                    }
                }
            }
        }

        outages.sort((a, b) => a.start - b.start);

        const stackedShapes = [];
        const rows = [];
        const barHeight = 0.02;

        for (const outage of outages) {
            let placed = false;
            for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                const lastInRow = rows[rowIdx][rows[rowIdx].length - 1];
                if (outage.start >= lastInRow.end) {
                    rows[rowIdx].push(outage);
                    stackedShapes.push({
                        type: 'rect',
                        x0: new Date(outage.start * 1000),
                        x1: new Date(outage.end * 1000),
                        y0: rowIdx * barHeight,
                        y1: (rowIdx + 1) * barHeight,
                        yref: 'paper',
                        fillcolor: outage.color,
                        opacity: 1,
                        line: { width: 0 },
                        layer: 'above'
                    });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                rows.push([outage]);
                stackedShapes.push({
                    type: 'rect',
                    x0: new Date(outage.start * 1000),
                    x1: new Date(outage.end * 1000),
                    y0: (rows.length - 1) * barHeight,
                    y1: rows.length * barHeight,
                    yref: 'paper',
                    fillcolor: outage.color,
                    opacity: 1,
                    line: { width: 0 },
                    layer: 'above'
                });
            }
        }

        Plotly.relayout(chart, { shapes: stackedShapes });
    });

    // get rid of the loading/progress bar
    loading.style.display = "none";
}


function initialize() {
    plottables = ["CNY", "HONEST.CNY"];
    addAsset(plottables[0]); // update selected tokens
    document.getElementById("tokenSearch").value = "CNY"; // "search"
    dispSearch(); // show search
    const dayBox = document.getElementById("daysAgoBox");
    const start_val = dayBox.value
    dayBox.value = 7 // 7 days ago
    plot_feed();
    dayBox.value = start_val
}

initialize();
