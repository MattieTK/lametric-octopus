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

  c.header('Cache-Control', `max-age=${secondsToNext30}`)

  const location = c.req.query('location')
  const cheapestParam = c.req.query('cheapest') // '1' or '0'
  const tomorrowParam = c.req.query('tomorrow') // '1' or '0'

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
    const frames: Array<{ text?: string; goalData?: { start: number; current: number; end: number; unit: string }; icon: number }> = []

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
      })
    } else {
      frames.push({
        "text": `error`,
        "icon": 58195,
      })
      return c.json({ frames })
    }

    // Handle cheapest rate display
    if (cheapestParam === '1') {
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
    if (tomorrowParam === '1') {
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