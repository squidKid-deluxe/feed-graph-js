# AGENTS.md

## Run

Open `index.html` directly in a browser. No build step or dev server required.

## Project Structure

- `index.html` - Entry point (HTML + loads scripts)
- `feed_graph.js` - Main application logic
- `graphene-rpc.js` - Bitshares RPC client library (vendor)

## Dependencies

External via CDN: Plotly.js, axios. No local package management.

## No Build/Test/Lint

This is a vanilla JS/HTML project. No build system, no tests, no CI.