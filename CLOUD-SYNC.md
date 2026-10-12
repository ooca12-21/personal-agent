# 云端同步

前端仍部署于 GitHub Pages。Supabase 项目为 `oezyotrxkvrspufavhll`，区域新加坡。公开浏览器配置位于 `cloud-config.js`；仅使用 publishable key，不允许放入数据库密码、OAuth secret 或 service-role key。

## 后端配置

1. 在 Supabase SQL Editor 执行 `supabase-setup.sql`（本地源文件为 `supabase/setup.sql`），仅执行一次。创建 `agent_documents` 和 `agent_sync`。
2. GitHub OAuth app 首页为 `https://ooca12-21.github.io/personal-agent/`，回调为 `https://oezyotrxkvrspufavhll.supabase.co/auth/v1/callback`；Client ID 和 secret 只保存在 Supabase GitHub provider 配置中。
3. Authentication Site URL 为网站完整地址。不要设置通配回调。
4. Supabase JS 2.117.3 UMD 包来自 npm，许可证为 SUPABASE-LICENSE。前端使用 PKCE 登录。

## 使用

登录同一个 GitHub 账号即可同步。账号首次登录默认空清单；可以选择合并此设备原有记录，或暂不合并。退出后回到此设备未登录清单，账号缓存独立保存。

修改先写本地缓存，约 700ms 后同步；页面可见时每 15 秒检查云端，回到页面或联网时检查，也可点击“同步”。网页关闭时不会后台同步。无需同时打开两台设备。

云端每个账号一条文档，限制 1MB。数据包括任务/子任务、排序、标签、备注、完成时间、事项记录、已删除记录和记录删除标记。导出功能仅导出任务数据，不导出登录凭证。

RLS 允许账号读写自己的文档；anon 无表权限。同步函数为 security invoker，按用户锁和版本号进行 compare-and-swap。版本冲突时进行三方合并：不同任务和不同字段保留，删除优先于旧编辑；同一字段冲突采用后一次成功同步的修改。并发新增的同名任务以独立 ID 保留。同步请求途中发生的修改也会再次同步。

离线修改保留账号本地缓存。若浏览器清理缓存、私密模式退出或存储失败，未上传的修改可能丢失；状态栏显示失败，可导出 JSON。云端不是独立的版本备份，重要记录仍建议定期导出。

## 验证

本地测试覆盖现有模型/日期规则/重复任务，以及并发编辑、子任务、删除、排序、完成归档、离线、同步中新增、账号隔离及重新加载。真实云端验证须在部署后通过 OAuth 登录，并以两个独立客户端测试。未配置 SMTP，当前仅显示 GitHub 登录。

官方文档：[GitHub 登录](https://supabase.com/docs/guides/auth/social-login/auth-github)、[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)。
