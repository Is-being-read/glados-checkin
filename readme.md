# Checkin

GitHub Actions 实现 [GLaDOS][glados] 自动签到

([GLaDOS][glados] 可用邀请码: `MW4DK-O0RSF-C7AOU-EN1MP`, 双方都有奖励天数)

## 使用说明

1. Fork 这个仓库

1. 登录 [GLaDOS][glados] 获取 Cookie

1. 添加 Cookie 到 Secret `GLADOS`

1. 启用 Actions, 每天北京时间 00:10 自动签到

## 高级功能

1. 如有多个帐号, 可以写为多行 Secret `GLADOS`, 每行写一个 Cookie

1. 如需修改时间, 可以修改文件 [run.yml](.github/workflows/run.yml#L7) 中的 `cron` 参数, 格式可参考 [crontab]

1. 如需推送通知, 可配置 Secret `NOTIFY`, 已支持:
    1. [Server酱][serverchan]（推荐）：
        - 方式 A：直接配置 Secret `SCKEY`（推荐）。只要设置了 `SCKEY`，即使不配置 `NOTIFY` 也会推送
        - 方式 B：在 `NOTIFY` 中配置 `serverchan:{SCKEY}`（用于和其他渠道一起配多行）
        - 获取 `SCKEY`：登录 Server酱官网创建/查看 SendKey（常见以 `SCT` 开头）
        - 推送内容会区分：✅签到成功 / ⚠️今日已签到 / ❌Cookie 失效
    1. [WxPusher][wxpusher]: 格式 `wxpusher:{token}:{uid}`
    1. [PushPlus][pushplus]: 格式 `pushplus:{token}`
    1. [PushDeer][pushdeer]: 格式 `pushdeer:{token}`
    1. [bark][bark]: 格式 `bark:{token}`
    1. Console: 格式 `console:log`, 作为日志输出, 一般用于调试
    1. 如需配置多个, 可以写为多行, 每行写一个

1. 注意: Cookie 以及接口输出数据, 包含帐号敏感信息, 因此不要随意公开

---

[glados]: https://github.com/glados-network/GLaDOS
[crontab]: https://crontab.guru/
[pushplus]: https://www.pushplus.plus/
[wxpusher]: https://wxpusher.zjiecode.com/
[pushdeer]: https://github.com/easychen/pushdeer
[bark]: https://bark.day.app
[serverchan]: https://sct.ftqq.com/
