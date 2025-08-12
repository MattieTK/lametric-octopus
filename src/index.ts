import { Hono } from 'hono'
import { octopusAgilePricing, getCheapestPriceForDay } from './octopus'

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
  const showCheapest = c.req.query('cheapest') === 'true'
  const showTomorrow = c.req.query('tomorrow') === 'true'
  
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
    const frames: Array<{ text: string; icon: number }> = []
    
    const currentData = await octopusAgilePricing(location)
    
    if (currentData?.value_inc_vat !== undefined) {
      frames.push({
        "text": `${currentData.value_inc_vat.toFixed(2).toString()}p`,
        "icon": 95,
      })
    } else {
      frames.push({
        "text": `error`,
        "icon": 95,
      })
      return c.json({ frames })
    }
    
    if (showCheapest) {
      const today = new Date()
      const cheapestToday = await getCheapestPriceForDay(location, today)
      if (cheapestToday) {
        const timeString = new Date(cheapestToday.valid_from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        frames.push({
          "text": `${cheapestToday.value_inc_vat.toFixed(2)}p at ${timeString}`,
          "icon": 36,
        })
      }
    }
    
    if (showTomorrow) {
      const now = new Date()
      const currentHour = now.getHours()
      
      if (currentHour >= 16) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        const cheapestTomorrow = await getCheapestPriceForDay(location, tomorrow)
        if (cheapestTomorrow) {
          frames.push({
            "text": `Tom: ${cheapestTomorrow.value_inc_vat.toFixed(2)}p`,
            "icon": 37,
          })
        }
      }
    }
    
    return c.json({ frames })
    
  } catch (error) {
    console.log("Error:", error)
    return c.json({
      "frames": [
        {
          "text": `error`,
          "icon": 95,
        },
      ],
    })
  }
})

export default app