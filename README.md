# ant-task

一个小巧且快速的脚本任务运行器。

可快速定义脚本任务，并批量执行，不会因为某个任务出错而导致后续任务中止执行。所有执行脚本保留完整日志输出，以便于问题追踪。

## 如何使用？

### 安装

```bash
npm install ant-task -g

# 或

yarn global add ant-task
```

### 定义任务脚本

 创建任意空的文本文件（例如：`task.txt`），参照以下内容宝义需要运行的任务。

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

## License

MIT