const cron = require('node-cron')
const { runScraper } = require('../scraper/agmarknetScraper')

let isRunning = false

/**
 * Price Update Cron Job
 * Runs scraper every 6 hours: at 00:00, 06:00, 12:00, 18:00
 * Prevents concurrent runs with isRunning flag
 */
const job = cron.schedule('0 */6 * * *', async () => {
  if (isRunning) {
    console.log('⏭️  Scraper already running, skipping this cycle')
    return
  }

  isRunning = true
  console.log(`🕐 Scheduled scrape triggered at ${new Date().toISOString()}`)

  try {
    await runScraper()
  } catch (err) {
    console.error('❌ Scheduled scraper error:', err.message)
  } finally {
    isRunning = false
  }
}, {
  scheduled: false, // Don't start immediately — start() is called from server.js
  timezone: 'Asia/Kolkata'
})

module.exports = job
