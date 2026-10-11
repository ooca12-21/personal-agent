# Personal Agent

手机可用的个人规划网页，使用本地日期规则，无需 AI 或 API key。

访问：https://ooca12-21.github.io/personal-agent/

- 首页：直接输入并添加待办，下方显示今日任务。
- 计划汇总：今天与未来七天；待安排、其他日期记录保留。
- 支持相对日期、星期、具体日期、每天、工作日、周末和日期范围。
- “从今天开始，接下来一周完成文献综述”创建持续七天的大任务，进度跨日期同步。
- 任务拆解：三个初始空栏，可继续添加；保存后成为大任务的子任务，单独打勾。
- 添加无需二次确认，不填写耗时。任务可修改名称和日期。
- 保留旧浏览器记录，支持导出 JSON。

数据仅存当前浏览器 localStorage（pa-prototype-v1），不跨设备同步，不上传 GitHub。不连接 AI；任务拆解由用户填写。

GitHub Pages 从 main 分支根目录发布 index.html、rules.js。可使用 python3 -m http.server 预览。
