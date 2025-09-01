import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { octopusAgilePricing, getCheapestPriceForDay, getFreeElectricityPeriodsForDay, getCheapestUpcomingPrice, getMostExpensivePriceForDay } from './octopus'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Cloudflare Workers!')
})

app.get('/lametric', cache({
  cacheName: 'lametric-cache',
  cacheControl: 'public',
  vary: ['X-Period', 'location', 'cheapest', 'tomorrow']
}), async (c) => {
  const now = new Date()
  const minutes = now.getMinutes()
  const minutesToNext30 = minutes < 30 ? 30 - minutes : 60 - minutes
  const secondsToNext30 = (minutesToNext30 * 60) - now.getSeconds()

  // Calculate current 30-minute period for cache key
  const currentPeriod = Math.floor(now.getTime() / (30 * 60 * 1000))
  
  // Calculate absolute expiration time for current period
  const nextPeriodStart = (currentPeriod + 1) * 30 * 60 * 1000
  const expiresTime = new Date(nextPeriodStart)
  
  // Set period header for cache variation
  c.header('X-Period', currentPeriod.toString())

  const location = c.req.query('location')
  const cheapestParam = c.req.query('cheapest')
  const tomorrowParam = c.req.query('tomorrow')

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
        const timeString = new Date(cheapestUpcoming.valid_from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
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

    // Set cache headers aligned with electricity pricing periods
    c.header('Cache-Control', 'public')
    c.header('Expires', expiresTime.toUTCString())
    
    return c.json({ frames })

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