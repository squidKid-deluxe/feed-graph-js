# Bitshares Price Feed Grapher

A web-based tool for searching and plotting the price feed of any Margin Position Asset (MPA) on the Bitshares blockchain, with historical data going back as far as needed.

![Screenshot](./Screenshot%20from%202026-04-18%2012-36-52.png)

## Features

- **Search & Plot**: Search for any MPA on Bitshares and plot its price feed over time
- **Multi-Producer Comparison**: Compare price feeds from multiple feed producers on the same chart
- **Outage Detection**: Automatically detects and highlights producer outages:
  - Gaps in data are marked with colored indicator bars at the bottom of the chart
  - Outages from plot start until first data point are also detected
  - Overlapping outages are stacked to avoid overlap
- **Flexible Date Range**: Plot data from any date range (days, weeks, months ago)
- **Caching**: Previously fetched data is cached for faster subsequent loads
- **Default Colors**: Uses default Plotly color palette when not specified

## Usage

1. Open `index.html` in a browser
2. Search for a token (e.g., "CNY", "BTC", "USD")
3. Select the token to add it to the plot
4. Adjust the date range (days ago)
5. Click "Plot Feed" to render

## Technical Details

- Uses Kibana Elasticsearch for historical feed data
- Uses Plotly.js for charting
- WebSocket connections to Bitshares public API nodes
- Data is cached in memory for performance

## Dependencies

- Plotly.js (via CDN)
- GrapheneRPC (included)
-Bitshares Elasticsearch index (es.bitshares.dev)

## Notes

- Initial data fetch may take several seconds depending on date range
- WebSocket connections may occasionally fail with error 1006 - refreshing the page typically resolves this