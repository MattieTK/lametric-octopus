import { Hono } from 'hono'
import { octopusAgilePricing, getCheapestPriceForDay, getFreeElectricityPeriodsForDay, getCheapestUpcomingPrice, getMostExpensivePriceForDay } from './octopus'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Cloudflare Workers!')
})

app.get('/lametric', async (c) => {
  const now = new Date()
  const minutes = now.getMinutes()
  const minutesToNext30 = minutes < 30 ? 30 - minutes : 60 - minutes
  const secondsToNext30 = (minutesToNext30 * 60) - now.getSeconds()

  // Create cache key based on query parameters and current 30-minute period
  const currentPeriod = Math.floor(now.getTime() / (30 * 60 * 1000))
  const location = c.req.query('location')
  const cheapestParam = c.req.query('cheapest') // 'true' or 'false'
  const tomorrowParam = c.req.query('tomorrow') // 'true' or 'false'
  
  const cacheKey = `lametric-${location}-${cheapestParam || 'false'}-${tomorrowParam || 'false'}-${currentPeriod}`
  
  // Try to get from cache first
  const cache = caches.default
  const cacheRequest = new Request(`https://lametric.cache/${cacheKey}`)
  
  let cachedResponse = await cache.match(cacheRequest)
  if (cachedResponse) {
    const response = new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers: cachedResponse.headers
    })
    response.headers.set('X-Cache', 'HIT')
    return response
  }

  if (!location || location.length < 1) {
    return c.json({
      "frames": [
        {
          "text": `Set location in app`,
          "icon": 95,
        },
      ],
    })
  }

  try {
    const frames: Array<{ text?: string; goalData?: { start: number; current: number; end: number; unit: string }; icon: number; duration?: number }> = []

    const currentData = await octopusAgilePricing(location)

    if (currentData?.value_inc_vat !== undefined) {
      // Determine icon based on whether current price is cheapest, most expensive, or other
      const today = new Date()
      const [cheapestToday, mostExpensiveToday] = await Promise.all([
        getCheapestPriceForDay(location, today),
        getMostExpensivePriceForDay(location, today)
      ])

      let icon = 58195 // Default icon for other hours

      if (cheapestToday && currentData.value_inc_vat === cheapestToday.value_inc_vat) {
        icon = 49411
      } else if (mostExpensiveToday && currentData.value_inc_vat === mostExpensiveToday.value_inc_vat) {
        icon = 49412
      }

      const currentPrice = currentData.value_inc_vat.toFixed(2)

      frames.push({
        "text": `${currentPrice}p`,
        "icon": icon,
        "duration": 10
      })
    } else {
      frames.push({
        "text": `error`,
        "icon": 58195,
      })
      return c.json({ frames })
    }

    // Handle cheapest rate display
    if (cheapestParam === 'true') {
      // Show cheapest upcoming rate
      const today = new Date()
      const cheapestUpcoming = await getCheapestUpcomingPrice(location, today)
      if (cheapestUpcoming) {
        const timeString = new Date(cheapestUpcoming.valid_from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        frames.push({
          "text": `${cheapestUpcoming.value_inc_vat.toFixed(2)}p at ${timeString}`,
          "icon": 58195,
        })
      }
    }

    // Handle tomorrow's rate display
    if (tomorrowParam === 'true') {
      const now = new Date()
      const currentHour = now.getHours()

      if (currentHour >= 16) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Show regular cheapest rate for tomorrow
        const cheapestTomorrow = await getCheapestPriceForDay(location, tomorrow)
        if (cheapestTomorrow) {
          frames.push({
            "text": `Cheapest tomorrow: ${cheapestTomorrow.value_inc_vat.toFixed(2)}p`,
            "icon": 52619,
          })
        }
      }
    }


    // If no frames were added at all (empty result), show current price as fallback
    if (frames.length === 0) {
      frames.push({
        "text": `${currentData.value_inc_vat.toFixed(2).toString()}p`,
        "icon": 58195,
      })
    }

    // Set cache headers before returning
    c.header('Cache-Control', `max-age=${secondsToNext30}`)
    c.header('X-Cache', 'MISS')
    
    const response = c.json({ frames })
    
    // Store in cache with proper headers
    const responseToCache = new Response(JSON.stringify({ frames }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${secondsToNext30}`,
        'X-Cache': 'MISS'
      }
    })
    
    await cache.put(cacheRequest, responseToCache.clone())
    
    return response

  } catch (error) {
    console.log("Error:", error)
    return c.json({
      "frames": [
        {
          "text": `error`,
          "icon": 58195,
        },
      ],
    })
  }
})

export default app