# Postman 接口集合

## 导入步骤

1. 打开 Postman（桌面版或网页版均可）。
2. 点击左上角 **Import**。
3. 选择或拖入文件：`HuiLiao-API.postman_collection.json`。
4. 导入后在左侧集合列表中找到 **「慧疗 HuiLiao 门诊 API」**。

## 快速开始

1. 启动 Spring Boot 后端（默认 `http://localhost:8080`）。
2. 打开集合 **Variables**，确认 `baseUrl` 正确。
3. 执行 **系统 → 登录**（会自动保存 `token`）。
4. 调用其他接口；集合已配置 Bearer `{{token}}` 鉴权。

## 演示账号

| 用户名 | 密码 | 角色说明 |
|--------|------|----------|
| admin | password | 管理员 |
| doctor01 | password | 医生 |
| cashier01 | password | 收银员 |
| pharma01 | password | 药师 |

数据来自 `docs/sql/demo_data.sql`。

## 集合变量说明

| 变量 | 说明 |
|------|------|
| baseUrl | 后端根地址 |
| token | 登录后自动写入 |
| patientId / scheduleId / registrationId / visitId 等 | 项目演示时手动填入上一步返回的 ID |

## AI 接口

调用 **AI 问答 → AI 聊天** 前，需先启动 Python FastAPI：

```bash
python -m ailearn_ai.API
```

默认监听 `http://127.0.0.1:8000`。

## 文件说明

- `HuiLiao-API.postman_collection.json` — Postman Collection v2.1，可直接 Import。
