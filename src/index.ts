import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { octopusAgilePricing, getCheapestPriceForDay, getFreeElectricityPeriodsForDay, getCheapestUpcomingPrice, getMostExpensivePriceForDay } from './octopus'

const app = new Hono()

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Octopus Agile Current Price - LaMetric App</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap');
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px 20px;
            background: #f5f5f5;
            color: #333;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #df4da4 0%, #a83279 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.2em;
            font-weight: 600;
        }
        
        .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .demo-section {
            padding: 40px;
            text-align: center;
        }
        
        .demo-section h2 {
            margin: 0 0 30px 0;
            color: #333;
            font-size: 1.8em;
        }
        
        .pixel-device {
            background: #000;
            border-radius: 8px;
            padding: 20px;
            margin: 0 auto 30px auto;
            max-width: 400px;
            position: relative;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        
        .pixel-device::before {
            content: '';
            position: absolute;
            top: 10px;
            right: 15px;
            width: 8px;
            height: 8px;
            background: #00ff00;
            border-radius: 50%;
            box-shadow: 0 0 10px #00ff00;
        }
        
        .pixel-grid {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
            border-radius: 4px;
            padding: 8px;
        }
        
        .icon-section {
            margin-right: 12px;
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111;
            border-radius: 4px;
        }
        
        #lightning-canvas {
            width: 64px;
            height: 64px;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        }
        
        .text-section {
            flex: 1;
            height: 64px;
            display: flex;
            align-items: center;
            background: #111;
            border-radius: 4px;
            padding: 0 12px;
            overflow: hidden;
            position: relative;
        }
        
        #demo-text {
            color: #FFFFFF;
            font-family: "Pixelify Sans", monospace;
            font-size: 58px;
            font-weight: normal;
            line-height: 1.2;
            white-space: nowrap;
            display: inline-block;
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            transition: transform 0.5s ease-in-out;
        }
        
        .scrolling {
            animation: scroll-left 8s linear infinite;
        }
        
        .swipe-out {
            animation: swipe-down-out 0.5s ease-in-out forwards;
        }
        
        .swipe-in {
            animation: swipe-down-in 0.5s ease-in-out forwards;
        }
        
        @keyframes scroll-left {
            0% {
                transform: translateY(-50%) translateX(0);
            }
            100% {
                transform: translateY(-50%) translateX(calc(-100% - 24px));
            }
        }
        
        @keyframes swipe-down-out {
            0% {
                transform: translateY(-50%) translateX(0);
            }
            100% {
                transform: translateY(150%) translateX(0);
            }
        }
        
        @keyframes swipe-down-in {
            0% {
                transform: translateY(-150%) translateX(0);
            }
            100% {
                transform: translateY(-50%) translateX(0);
            }
        }
        
        @keyframes glow {
            from { text-shadow: 0 0 5px #ff8000; }
            to { text-shadow: 0 0 20px #ff8000, 0 0 30px #ff8000; }
        }
        
        .features {
            background: #f8f9fa;
            padding: 40px;
        }
        
        .features h3 {
            margin: 0 0 20px 0;
            text-align: center;
            color: #333;
        }
        
        .feature-list {
            list-style: none;
            padding: 0;
            max-width: 500px;
            margin: 0 auto;
        }
        
        .feature-list li {
            padding: 10px 0;
            border-bottom: 1px solid #eee;
            font-size: 1.1em;
        }
        
        .feature-list li:last-child {
            border-bottom: none;
        }
        
        .api-info {
            padding: 40px;
            text-align: center;
            background: #fff;
        }
        
        .api-info h3 {
            margin: 0 0 20px 0;
            color: #333;
        }
        
        .install-button {
            display: inline-block;
            background: linear-gradient(135deg, #df4da4 0%, #a83279 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1.2em;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(223, 77, 164, 0.3);
            transition: all 0.3s ease;
        }
        
        .install-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(223, 77, 164, 0.4);
            text-decoration: none;
            color: white;
        }
        
        .disclaimer {
            background: #f8f9fa;
            border-left: 4px solid #df4da4;
            padding: 20px;
            margin-top: 20px;
            font-size: 0.9em;
            color: #666;
        }
        
        .disclaimer a {
            color: #df4da4;
            text-decoration: none;
        }
        
        .disclaimer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Octopus Agile Current Price</h1>
            <p>Real-time electricity pricing for your LaMetric Time</p>
        </div>
        
        <div class="demo-section">
            <div class="pixel-device">
                <div class="pixel-grid">
                    <div class="icon-section">
                        <canvas id="lightning-canvas" width="64" height="64"></canvas>
                    </div>
                    <div class="text-section">
                        <div id="demo-text">Loading...</div>
                    </div>
                </div>
            </div>
            
        </div>
        
        <div class="features">
            <h3>Features</h3>
            <ul class="feature-list">
                <li>✅ Real-time current electricity prices</li>
                <li>⚡ Smart icons for cheapest and most expensive periods</li>
                <li>📅 Tomorrow's cheapest rate (after 4 PM)</li>
                <li>🔄 Automatic 30-minute updates aligned with pricing periods</li>
                <li>🌍 Support for all UK regions</li>
                <li>⏰ UK timezone support (GMT/BST)</li>
            </ul>
        </div>
        
        <div class="api-info">
            <h3>Get the App</h3>
            <a href="https://apps.lametric.com/apps/octopus_agile_current_price/14286" 
               target="_blank" 
               rel="noopener noreferrer"
               class="install-button">
                📱 Install on LaMetric
            </a>
            <p>Click to install this app directly on your LaMetric Time device</p>
        </div>
        
        <div class="disclaimer">
            <p><strong>Disclaimer:</strong> This tool is not officially affiliated with Octopus Energy. It's an open source project available on <a href="https://github.com/MattieTK/lametric-octopus" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
        </div>
    </div>
    
    <script>
        // Draw 8x8 lightning bolt with specified colors
        function drawLightningBolt() {
            const canvas = document.getElementById('lightning-canvas');
            const ctx = canvas.getContext('2d');
            
            // Lightning bolt pattern: B=Black, Y=Yellow, O=Orange, OR=Orange-Red
            const pattern = [
                ['B','B','B','B','Y','Y','Y','B'],  // Row 1
                ['B','B','B','Y','Y','Y','B','B'],  // Row 2
                ['B','B','Y','Y','Y','B','B','B'],  // Row 3
                ['B','O','O','O','B','B','B','B'],  // Row 4
                ['B','B','B','O','O','O','B','B'],  // Row 5
                ['B','B','B','OR','OR','B','B','B'], // Row 6
                ['B','B','OR','OR','B','B','B','B'], // Row 7
                ['B','B','OR','B','B','B','B','B']   // Row 8
            ];
            
            // Color mapping
            const colors = {
                'B': '#000000',   // Black
                'Y': '#FFFF00',   // Yellow
                'O': '#FF8000',   // Orange
                'OR': '#FF4000'   // Orange-Red
            };
            
            const pixelSize = 8; // Each pixel is 8x8 on the 64x64 canvas
            
            // Draw each pixel
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    ctx.fillStyle = colors[pattern[y][x]];
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
        
        // Check if text needs to scroll and apply animation after delay
        function updateTextDisplay(textElement, text, isNewFrame = false) {
            textElement.textContent = text;
            textElement.classList.remove('scrolling', 'swipe-out', 'swipe-in');
            
            // Force reflow to reset animation
            textElement.offsetHeight;
            
            if (isNewFrame) {
                // Apply swipe-in animation for new frames
                textElement.classList.add('swipe-in');
                
                // Remove swipe-in class after animation completes
                setTimeout(() => {
                    textElement.classList.remove('swipe-in');
                    checkAndScroll(textElement);
                }, 500);
            } else {
                checkAndScroll(textElement);
            }
        }
        
        function checkAndScroll(textElement) {
            // Check if text overflows container after 1 second delay
            setTimeout(() => {
                const container = textElement.parentElement;
                const textWidth = textElement.scrollWidth;
                const containerWidth = container.clientWidth - 24; // Account for padding
                
                if (textWidth > containerWidth) {
                    textElement.classList.add('scrolling');
                }
            }, 1000);
        }
        
        // Swipe out current frame and prepare for next
        function swipeToNextFrame(textElement, callback) {
            textElement.classList.remove('scrolling');
            textElement.classList.add('swipe-out');
            
            setTimeout(() => {
                callback();
            }, 500);
        }
        
        // Fetch data from API and update display
        async function updateDisplay() {
            try {
                const response = await fetch('/lametric?location=London&cheapest=true');
                const data = await response.json();
                
                if (data.frames && data.frames.length > 0) {
                    let frameIndex = 0;
                    let isFirstFrame = true;
                    
                    function showFrame() {
                        const frame = data.frames[frameIndex];
                        const textElement = document.getElementById('demo-text');
                        
                        if (isFirstFrame) {
                            // Show first frame without swipe animation
                            updateTextDisplay(textElement, frame.text || 'ERROR', false);
                            isFirstFrame = false;
                        } else {
                            // Swipe out current frame, then swipe in new frame
                            swipeToNextFrame(textElement, () => {
                                updateTextDisplay(textElement, frame.text || 'ERROR', true);
                            });
                        }
                        
                        frameIndex = (frameIndex + 1) % data.frames.length;
                    }
                    
                    // Show first frame immediately
                    showFrame();
                    
                    // Cycle through frames
                    setInterval(showFrame, 5000);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                // Show error state
                const textElement = document.getElementById('demo-text');
                updateTextDisplay(textElement, 'ERROR', false);
                textElement.style.color = '#FF4444';
            }
        }

        // Start the display when page loads
        document.addEventListener('DOMContentLoaded', () => {
            drawLightningBolt();
            updateDisplay();
        });
        
        // Update every 30 minutes
        setInterval(updateDisplay, 30 * 60 * 1000);
    </script>
</body>
</html>
  `)
})

app.get('/lametric', cache({
  cacheName: 'lametric-cache',
  cacheControl: 'public',
  vary: ['X-Period', 'location', 'cheapest', 'tomorrow']
}), async (c) => {
  const now = new Date()

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

// Generate 8x8 lightning bolt PNG as base64
function generateLightningBoltIcon(): string {
  // Using a yellow lightning bolt icon in 8x8 PNG format
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAPklEQVQYlV2NQQ4AIAgDK/7/Ze2JGDAemhQKbWEtIiAAAFprrdZa11prvffee++9915rrbXWWmuttdZa67oOzgMf3CdKV5kHjAAAAABJRU5ErkJggg=="
}

// Demo endpoint that displays pixel grid with lightning bolt
app.get('/demo', async (c) => {
  const lightningIcon = generateLightningBoltIcon()

  return c.json({
    "frames": [
      {
        "text": "PIXEL GRID DEMO",
        "icon": lightningIcon,
        "duration": 8000
      },
      {
        "text": "37x8 DISPLAY",
        "icon": lightningIcon,
        "duration": 4000
      },
      {
        "text": "8x8 LIGHTNING",
        "icon": lightningIcon,
        "duration": 4000
      },
      {
        "text": "LEFT: 8x8 COLOR",
        "icon": lightningIcon,
        "duration": 4000
      },
      {
        "text": "RIGHT: 29x8 TEXT",
        "icon": lightningIcon,
        "duration": 4000
      }
    ]
  })
})

export default app