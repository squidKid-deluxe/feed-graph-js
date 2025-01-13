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
var plottables = new Array();


function publicNodes() {
    /**
    use these nodes for all operations
    */
    return [
        "wss://dex.iobanker.com/ws",
        "wss://api.bts.mobi/wss",
        "wss://bitsharesapi.loclx.io/ws",
        "wss://api-us.61bts.com/ws",
        "wss://btsapi.magicw.net/wss",
        "wss://api.dex.trading/ws",
        "wss://btsws.roelandp.nl/ws",
        "wss://eu.nodes.bitshares.ws/ws",
        "wss://public.xbts.io/ws",
        "wss://node.xbts.io/ws",
        "wss://bts.mypi.win/ws",
        "wss://cloud.xbts.io/wss",
        "wss://api.61bts.com/wss",
        "wss://api.btslebin.com/wss",
        "wss://api.bts.btspp.io:10100/ws",
    ]
}

async function wssHandshake() {
    /**
     * Create a websocket handshake.
     */
    const nodes = publicNodes();
    let rpc;
    while (true) {
        const node = nodes[0];
        const start = Date.now();
        try {
            rpc = new WebSocket(node);
            rpc.onopen = function() {
                console.log('WebSocket connection established.');
            };
            rpc.onerror = function(error) {
                console.error('WebSocket error: ', error);
            };
            rpc.onclose = function(event) {
                if (event.wasClean) {
                    console.log('WebSocket connection closed cleanly.');
                } else {
                    console.error(
                        'WebSocket connection died unexpectedly: ',
                        event);
                }
            };
            while (!rpc.readyState) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (Date.now() - start > 3000) {
                    continue;
                }
            }
        } catch (error) {
            console.error('Error creating WebSocket connection: ', error);
            nodes.push(nodes.shift());
            continue;
        }
        break;
    }
    return rpc;
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

async function kibana(start, stop, tokens) {
    const url = `https://es.bts.mobi/bitshares-*/_async_search`;

    const headers = {
        'Content-Type': 'application/json'
    };

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
        fields: [{
            field: "operation_history.op_object.publisher.keyword"
        }, {
            field: "operation_history.op_object.feed.settlement_price.base.amount"
        }, {
            field: "operation_history.op_object.feed.settlement_price.quote.amount"
        }, {
            field: "operation_history.op_object.feed.settlement_price.base.asset_id"
        }],
        size: 10000,
        version: true,
        script_fields: {},
        stored_fields: ["*"],
        runtime_mappings: {},
        _source: false,
        query: {
            bool: {
                must: [],
                filter: [{
                    bool: {
                        should: tokens.map(token => {
                            return {
                                bool: {
                                    should: [{
                                        match: {
                                            "operation_history.op_object.feed.settlement_price.base.asset_id": token
                                        }
                                    }],
                                    minimum_should_match: 1
                                }
                            };
                        }),
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
                }],
                should: [],
                must_not: []
            }
        },
        highlight: {
            pre_tags: ["@kibana-highlighted-field@"],
            post_tags: ["@/kibana-highlighted-field@"],
            fields: {
                "*": {}
            },
            fragment_size: 2147483647
        }
    };


    let response = await axios.post(url, requestData, {
        headers
    });

    if (response.data.is_running) {
        response = await axios.get("https://es.bts.mobi/_async_search/" + response.data.id + "?wait_for_completion_timeout=99999999s", {
            headers
        });
    }
    return response.data;
}

async function paginate(rpc, start, stop, assets) {
    let data = [];
    let sizeChange = 1;
    let page = 0;

    while (sizeChange > 0) {
        page++;
        console.log("tokens", assets, "page", page, "size_change", sizeChange,
            "start", start, "stop", stop);

        const kibanaResponse = (await kibana(start, stop, assets)).response.hits.hits;

        const response = kibanaResponse.map(hit => {
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


        // Create an array to store all the promises
        const promises = response.map(async entry => {
            // Inside the map function, return a promise for each iteration
            return [entry.fields.producer, [entry.sort, await settlement_price(rpc, entry.fields), entry.fields.token]];
        });
        await new Promise(resolve => setTimeout(resolve, 500))

        // Wait for all promises to resolve
        const result = await Promise.all(promises);


        sizeChange = data.length

        // Now you can use the result array, which contains the resolved values for all promises
        data.push(...result);

        // Remove duplicate entries
        data = [...new Map(data.map(v => [JSON.stringify(v), v])).values()];

        sizeChange = data.length - sizeChange;
        data.sort((a, b) => a[1][0] - b[1][0]);
        try {
            stop = data[0][1][0];
        } catch {
            console.error("Result is empty! Callin' it good...")
            sizeChange = 0
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

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
    let ids = [];
    let required = []
    for (name of names) {
        if (idsAndNames[name] != undefined) {
            while (idsAndNames[name] === "waiting") {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            ids.push(idsAndNames[name]);
        } else {
            required.push(name);
        }
    }
    for (name of required) {
        idsAndNames[name] = "waiting"
        let response = await new Promise((resolve) => {
            wssQuery(rpc, ["database", "lookup_asset_symbols", [
                [name]
            ]]);
            rpc.onmessage = resolve;
        });
        try {
            if (!JSON.parse(response.data).result) {
                throw new Error("no response")
            }
            response = JSON.parse(response.data).result;
        } catch (error) {
            console.log(response);
            throw error;
        }
        id = response[0] ? response[0].id : null;
        idsAndNames[name] = id;
        ids.push(id);
    }
    return ids
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
    // turn on the loading gif
    let loadingGif = document.getElementById("loading");
    loadingGif.style.display = "block";

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
                color: ["yellow", "skyblue", "tomato", "lime green"]
                    [Object.values(lookup).indexOf(label.split(
                        " - ")[1])],
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

    // initialize the plotly layout
    const layout = {
        showlegend: false,
        hovermode: "closest",
        title: 'Token Data Plot',
        xaxis: {
            title: 'Time',
            color: "#fff",
        },
        yaxis: {
            title: 'Price',
            color: "#fff",
            // type: "log",
        },
        font: {
            family: 'Courier New, monospace',
            color: '#ffffff'
        },
        plot_bgcolor: "#111111aa",
        paper_bgcolor: "#11111100",
        datarevision: Math.random(),
    };

    // plot everything
    // if (start) {
    // let chart = document.getElementById("plotlyDiv")
    // chart.innerHTML = "";
    Plotly.react("plotlyDiv", JSON.parse(JSON.stringify(plotData)), layout, { responsive:true });
    // Plotly.newPlot("chart-window", data, layout, {
    //     displayModeBar: false
    // });

    // } else {
    //     Plotly.update('plotlyDiv', plotData, layout);
    // }

    // get rid of the loading gif
    loadingGif.style.display = "none";
    // start = false;
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
