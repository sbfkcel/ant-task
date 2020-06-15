# 🐜 ant-task

一个小巧且快速的脚本任务运行器。

可快速定义脚本任务，并批量执行，不会因为某个任务出错而导致后续任务中断。所有执行脚本保留完整运行日志，以便于问题追踪。

## 如何使用？

### 安装

```bash
npm install ant-task -g

# 或

yarn global add ant-task
```

### 定义任务脚本

创建文本文件（例如：`task.txt`），参照以下内容定义需要运行的脚本任务。

```txt
任务一
---
node build.js
python install.py

任务二
---
node build.js
python install.py
```

### 使用

```bash
atask task.txt
```

> 日志文件输出在`任务配置文件同级目录/antTaskLogs/`中（按任务名称及子顺便顺序命名）。

## License

MIT
