# LaMetric Octopus Agile

A Cloudflare Worker API that provides Octopus Energy Agile pricing data formatted for LaMetric TIME devices.

## Overview

This service fetches real-time electricity pricing data from the Octopus Energy Agile tariff and formats it for display on LaMetric TIME smart displays. It provides current prices, cheapest rates for the day, and optional tomorrow's cheapest rate.

## Features

- **Current Pricing**: Shows the current electricity rate in pence per kWh
- **Cheapest Rate Today**: Displays the cheapest rate and time for the current day
- **Tomorrow's Preview**: Shows tomorrow's cheapest rate (available after 4 PM)
- **Free Electricity Alerts**: Notifies when electricity is free or you're paid to use it
- **Smart Caching**: Automatically caches responses until the next 30-minute pricing period

## API Endpoints

### GET `/lametric`

Returns pricing data formatted for LaMetric TIME devices.

**Query Parameters:**
- `location` (required): UK region name
- `cheapest` (optional): `true` to show today's cheapest rate, `only_free` to show only if electricity is free/negative
- `tomorrow` (optional): `true` to show tomorrow's cheapest rate (after 4 PM), `only_free` to show only if electricity is free/negative

**Examples:**
```
# Basic usage
/lametric?location=London&cheapest=true&tomorrow=true

# Show cheapest rates, but only display tomorrow if it's free
/lametric?location=London&cheapest=true&tomorrow=only_free

# Show only when electricity is free/negative (today and tomorrow)
/lametric?location=London&cheapest=only_free&tomorrow=only_free
```

## Development

### Prerequisites

- Node.js
- Wrangler CLI

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

```bash
npm run dev
```

### Deployment

```bash
npm run deploy
```

## Usage with LaMetric TIME

1. Add a "Data (DIY)" indicator in the LaMetric app
2. Set the URL to your deployed worker endpoint
3. Set refresh interval to 30 minutes

## Data Source

This service uses the Octopus Energy API to fetch Agile tariff pricing data. Prices are updated every 30 minutes and the service automatically caches responses until the next update period.

## License

ISC