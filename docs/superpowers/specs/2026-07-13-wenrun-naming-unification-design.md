# WenRun 命名统一设计

## 目标

将项目中 HuiLiao/huiliao、AILearn、huiliao-react 等历史命名统一为 WenRun 体系，并与本地 MySQL `wenrun` 架构保持一致。

## 目录与组件

- Java 后端目录：`WenRun`
- React 前端目录：`React`
- Python AI 服务目录：`AI`

## 代码命名

- Java 包名由 `com.example.huiliao` 改为 `com.example.wenrun`。
- Spring Boot 类、Maven artifact/name、前端 package name 和 Python 客户端/配置标识统一使用 `wenrun`。
- 文档、SQL、Postman 示例、环境变量、localStorage key、Qdrant collection 名称统一切换到 `wenrun`。

## 数据与兼容性

项目尚未上线，数据库架构已命名为 `wenrun`，因此不保留旧 HuiLiao 兼容别名，不设计迁移兼容层。

## 验证

- 全局搜索不再出现业务代码和文档中的旧 HuiLiao/huiliao 标识（仅允许 Git 历史或明确第三方内容）。
- Java、Python、React 的构建/静态检查按现有项目工具执行。
- 数据库连接配置指向 `wenrun`。
