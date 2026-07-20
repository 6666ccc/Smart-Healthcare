# WenRun 授权与 AI 服务边界加固设计

## 目标

修复当前系统中患者越权、FastAPI AI 服务可被直接调用、Python 并发请求之间串用患者令牌，以及关键医疗业务操作缺少资源归属校验的问题。

本设计不改变挂号、接诊、开方、收费和发药的业务状态机，也不修改数据库中的医疗业务字段。

## 信任边界

```text
React 浏览器 --用户 JWT--> Spring Boot --内部 API Key + 已验证身份--> FastAPI
                                     |                                  |
                                     +------------> MySQL <--------------+
```

- 浏览器只能访问 Spring Boot 的 `/api/**` 接口，不能直接访问 FastAPI。
- Spring Boot 是用户 JWT 的唯一验证边界。它从已验证的 claims 派生 userId、patientId 和 staffId，客户端提交的同名字段不可信。
- FastAPI 只接受携带有效内部 API Key 的 Java 服务请求；其仅将 Java 已验证的 JWT 用作调用 Java 业务工具时的用户身份凭据。
- FastAPI 不再持有跨请求的认证全局状态。

## Java 授权设计

### 默认拒绝与显式放行

`AuthInterceptor` 改为对所有受保护的 `/api/**` 路径进行显式授权。未定义规则的路径返回 403，而不是只校验登录态。

授权规则按 HTTP 方法与路径划分，而不是只靠前缀：

- 患者：仅可查询和修改自身档案、创建/查看/取消自身挂号、查看自身收费单并支付、使用 AI 聊天。
- 医护/内部人员：可访问其职责范围内的患者、就诊、处方、检查、收费、库存和管理资源。
- 仅内部管理角色可创建或修改科室、员工、药品、医疗项目与排班。

公开接口仅保留健康检查、登录和注册。服务 API Key 仍仅用于 FastAPI 代表已登录用户调用受保护的 Java 业务工具，不能代替业务资源归属检查。

### 服务层资源归属

路由授权之外，服务层必须保持不可绕过的归属校验：

- 创建收费单前校验 `visitId` 属于当前患者；患者不得为其他患者的就诊记录建单。
- 作废处方时校验当前医生拥有该处方对应的接诊记录。
- 查询或更新就诊记录、检查单和处方时，患者只能访问自身数据，医生只能访问其接诊范围内的数据。
- 对并发生成收费单，在数据库增加费用来源唯一约束，或在同一事务中锁定业务来源；应用层 `count` 不能作为唯一防线。

## AI 服务设计

### 服务鉴权

Java 的 `JavaAiClient` 对每次调用 FastAPI `/java/**` 添加 `X-API-Key`。FastAPI 添加统一依赖项：

1. 读取 `X-API-Key`；
2. 使用常量时间比较校验 `WENRUN_API_KEY`；
3. 缺失或错误时立即返回 401；
4. 只在通过校验后解析请求体、检索记忆或执行图。

FastAPI 不接受客户端可伪造的 `user_id` 作为身份来源。Java 在转发时覆盖 userId、patientId、staffId 和 access token；FastAPI 对这些字段只视为已经过网关验证的内部上下文。

### 请求上下文隔离

Python 以 `ContextVar` 保存当前请求的患者 access token：

- `/java/chat` 和 `/java/chat/resume` 在图执行前设置 token，执行结束后使用 token 重置句柄恢复上下文。
- 工具客户端只从 `ContextVar` 读取 token。
- 删除模块级 `_patient_access_token` 和 `set_patient_token` 的共享可变状态。
- 同一请求中由 LangGraph 发起的工具调用可读取该上下文；并行请求互不影响。

## HITL 会话约束

本轮保持现有 `InMemorySaver`，但恢复请求必须带经 Java 验证的用户身份，并与首次创建 checkpoint 的 userId 比对。用户不匹配时返回 403。

内存 checkpoint 在服务重启后丢失仍是明确限制；下一阶段替换为持久化 checkpointer，并设置过期时间和会话删除策略。

## 验收与测试

- Java：患者访问员工、科室、就诊、检查和库存管理接口返回 403；患者不能为他人就诊建收费单；医生不能作废其他医生处方。
- Python：无 API Key 与错误 API Key 返回 401；正确 Key 可以调用；并发请求分别传入不同 token 时工具调用使用各自 token。
- 现有 Python 单测继续通过；Java 测试在可重复的测试配置下完成；React lint 作为独立已有问题记录，不作为本次安全改动的验收阻塞项。

## 不在本次范围内

- 重新设计完整 RBAC 权限表与角色管理界面。
- 将 JWT 从浏览器 localStorage 迁移到 HttpOnly Cookie。
- Qdrant 中既有历史记忆的数据迁移与删除策略。
- 持久化 LangGraph checkpoint 的基础设施部署。
