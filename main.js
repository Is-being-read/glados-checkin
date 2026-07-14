const requestJson = async (url, options) => {
  const resp = await fetch(url, options)
  let data = null
  try {
    data = await resp.json()
  } catch {
    data = null
  }
  return { resp, data }
}

const isAlreadyCheckedInMessage = (message) => {
  const m = String(message || '').toLowerCase()
  return (
    m.includes('already') ||
    m.includes('tomorrow') ||
    m.includes('checked in') ||
    m.includes('已签到')
  )
}

const isCookieInvalid = (resp, message) => {
  if (resp && (resp.status === 401 || resp.status === 403)) return true
  const m = String(message || '').toLowerCase()
  return (
    m.includes('unauthorized') ||
    m.includes('not login') ||
    m.includes('not logged') ||
    m.includes('login') ||
    m.includes('token invalid') ||
    m.includes('invalid token')
  )
}

const glados = async () => {
  if (!process.env.GLADOS) return
  const cookies = String(process.env.GLADOS).split('\n').map((s) => s.trim()).filter(Boolean)
  if (cookies.length === 0) return

  const items = []
  for (const [i, cookie] of cookies.entries()) {
    const common = {
      'cookie': cookie,
      'referer': 'https://glados.cloud/console/checkin',
      'user-agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
    }

    let state = 'success'
    let action = null
    let status = null

    try {
      const actionResult = await requestJson('https://glados.cloud/api/user/checkin', {
        method: 'POST',
        headers: { ...common, 'content-type': 'application/json' },
        body: '{"token":"glados.cloud"}',
      })
      action = actionResult.data

      if (!actionResult.resp.ok || action?.code) {
        if (isCookieInvalid(actionResult.resp, action?.message)) {
          state = 'cookie_invalid'
        } else if (isAlreadyCheckedInMessage(action?.message)) {
          state = 'already'
        } else {
          state = 'error'
        }
      }

      if (state !== 'cookie_invalid') {
        const statusResult = await requestJson('https://glados.cloud/api/user/status', {
          method: 'GET',
          headers: { ...common },
        })
        status = statusResult.data

        if (!statusResult.resp.ok || status?.code) {
          if (isCookieInvalid(statusResult.resp, status?.message)) {
            state = 'cookie_invalid'
          } else {
            state = 'error'
          }
        }
      }
    } catch (error) {
      state = 'error'
      action = { message: String(error) }
    }

    const title =
      state === 'success'
        ? '✅签到成功'
        : state === 'already'
          ? '⚠️今日已签到'
          : state === 'cookie_invalid'
            ? '❌Cookie 失效'
            : '❌签到失败'

    const accountTitle = cookies.length > 1 ? `${title} 账号 #${i + 1}` : title
    const lines = []

    if (action?.message) lines.push(String(action.message))
    const leftDays = Number(status?.data?.leftDays)
    if (Number.isFinite(leftDays)) lines.push(`Left Days ${leftDays}`)
    if (state === 'cookie_invalid') lines.push('请更新 GLADOS Cookie 后重试')
    if (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY) {
      lines.push(`<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`)
    }

    items.push({ title: accountTitle, lines })
  }

  if (items.length === 1) return [items[0].title, ...items[0].lines]

  const notice = ['GLaDOS 签到结果']
  for (const item of items) {
    notice.push(item.title, ...item.lines, '---')
  }
  while (notice.length > 0 && (notice[notice.length - 1] === '' || notice[notice.length - 1] === '---')) {
    notice.pop()
  }
  return notice
}

const notify = async (notice) => {
  if (!notice) return
  const options = []
  if (process.env.NOTIFY) options.push(...String(process.env.NOTIFY).split('\n'))
  if (process.env.SCKEY) options.push(`serverchan:${process.env.SCKEY}`)
  if (process.env.SENDKEY) options.push(`serverchan:${process.env.SENDKEY}`)

  const targets = [...new Set(options.map((s) => String(s).trim()).filter(Boolean))]
  if (targets.length === 0) return

  for (const option of targets) {
    if (!option) continue
    try {
      if (option.startsWith('console:')) {
        for (const line of notice) {
          console.log(line)
        }
        continue
      }
      
      if (option.startsWith('serverchan:')) {
        const key = option.split(':')[1]
        if (!key) continue
        const url = key.startsWith('SCT')
          ? `https://sctapi.ftqq.com/${key}.send`
          : `https://sc.ftqq.com/${key}.send`
        const body = new URLSearchParams({
          text: notice[0],
          desp: notice.slice(1).join('\n\n'),
        })
        await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
        continue
      }
      
      if (option.startsWith('pushdeer:')) {
        await fetch(`https://api2.pushdeer.com/message/push`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            pushkey: option.split(':')[1],
            text:notice[0],
            desp: notice.join('. '),
            type:'markdown'
          })
        })
      }

      if (option.startsWith('bark:')) {
        const deviceKey = option.split(':')[1]
        await fetch(`https://api.day.app/${deviceKey}/`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'charset': 'utf-8' },
          body: JSON.stringify({
            title: notice[0],
            body: notice.join('. '),
            group: 'GLaDOS Checkin',
            icon: 'https://s2.loli.net/2025/09/28/1GgDtBWOHaxhmbZ.png',
          })
        })
      }

      if (option.startsWith('wxpusher:')) {
        await fetch(`https://wxpusher.zjiecode.com/api/send/message`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            appToken: option.split(':')[1],
            summary: notice[0],
            content: notice.join('<br>'),
            contentType: 3,
            uids: option.split(':').slice(2),
          }),
        })
        continue
      }
      
      if (option.startsWith('pushplus:')) {
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option.split(':')[1],
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
        continue
      }
      
      if (option.startsWith('qyweixin:')) {
        const qyweixinToken = option.split(':')[1]
        const qyweixinNotifyRebotUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + qyweixinToken;
        await fetch(qyweixinNotifyRebotUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
                content: notice.join('<br>')
            }
          }),
        })
        continue
      }
      
      // fallback
      await fetch(`https://www.pushplus.plus/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: option,
          title: notice[0],
          content: notice.join('<br>'),
          template: 'markdown',
        }),
      })
    } catch (error) {
      throw error
    }
  }
}

const main = async () => {
  await notify(await glados())
}

main()
