const automator = require('miniprogram-automator')
const fs = require('fs')

const LOG = 'd:\\code_center\\hunbei-invitation\\test-log.txt'
function log(msg) {
  fs.appendFileSync(LOG, String(msg) + '\n')
}

log('start')
log('automator keys: ' + Object.keys(automator).join(','))

automator.connect({
  wsEndpoint: 'ws://127.0.0.1:9420',
}).then(async (miniProgram) => {
  log('connected')
  log('miniProgram keys: ' + Object.keys(miniProgram).join(','))
  log('miniProgram proto: ' + Object.getOwnPropertyNames(Object.getPrototypeOf(miniProgram)).join(','))

  const allLogs = []
  miniProgram.on('console', (msg) => {
    const text = Array.isArray(msg.args) ? msg.args.join(' ') : String(msg)
    allLogs.push(`[${msg.type}] ${text}`)
  })

  await new Promise(r => setTimeout(r, 8000))

  try {
    // 用 evaluate 获取页面栈信息
    const routeInfo = await miniProgram.evaluate(() => {
      const pages = getCurrentPages()
      return pages.map(p => ({ route: p.route, url: p.__route__ }))
    })
    log('routes: ' + JSON.stringify(routeInfo))
  } catch (e) {
    log('evaluate error: ' + e.message)
  }

  try {
    const page = await miniProgram.currentPage()
    log('current page keys: ' + (page ? Object.keys(page).join(',') : 'null'))
    log('current page data: ' + JSON.stringify(page ? page.data : null).slice(0, 500))
  } catch (e) {
    log('page error: ' + e.message)
  }

  log('--- console logs (' + allLogs.length + ') ---')
  log(allLogs.slice(-200).join('\n'))

  await miniProgram.disconnect()
  log('done')
}).catch(e => {
  log('error: ' + e.message)
})
