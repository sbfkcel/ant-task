#!/usr/bin/env node

const fs = require('fs'),
    path = require('path'),
    childProcess = require('child_process'),
    fillIn = (num,len=2) => num < +(`1${new Array(len).join('0')}`) ? `${new Array(len).join('0')}${num}` : num,
    formatTime = time => time < 1000 * 60 ? `${(time / 1000).toFixed(2)}秒` : `${(time / 1000 / 60).toFixed(2)}分`,
    formatDate = dateNum => {
        let date = new Date(dateNum),
            year = date.getFullYear(),
            month = date.getMonth() + 1,
            day = date.getDate(),
            hours = date.getHours(),
            minutes = date.getMinutes(),
            seconds = date.getSeconds();
        return `${year}.${fillIn(month)}.${fillIn(day)} ${fillIn(hours)}:${fillIn(minutes)}:${fillIn(seconds)}`;
    },
    echoLine = str => console.log(new Array(60).join(str));

class Ing{
    constructor(str){
        const _ts = this;
        _ts.stdout = process.stdout;
        _ts.str = str;
        _ts.iconStr = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'.split('');
        _ts.index = 0;
        _ts.sTime = +new Date;
    }
    start(){
        const _ts = this;
        _ts.update();
        _ts.loop = setInterval(_ts.update.bind(_ts),100);
    }
    stop(){
        const _ts = this;
        _ts.stdout.clearLine();
        _ts.stdout.write('\r');
        clearInterval(_ts.loop);
    }
    update(){
        const _ts = this;
        _ts.stdout.clearLine();
        _ts.stdout.write(_ts.getText());
    }
    getText(){
        const _ts = this;
        let result = `\r${_ts.iconStr[_ts.index % _ts.iconStr.length]} ${_ts.str}   [${formatTime(+new Date - _ts.sTime)}]`;
        _ts.index++;
        return result;
    }
}

class AntTask{
    constructor(){
        const _ts = this;
        _ts.data = _ts.getData();
        _ts.logDir = process.argv[2] ? path.join(process.argv[2],'..','antTaskLogs') : 'antTaskLogs';
        _ts.taskCount = 0;
    }
    async init(){
        const _ts = this;
        try {
            _ts.emptyDir(_ts.logDir);
            return await _ts.runTask(_ts.data);
        } catch (error) {
            throw error;
        };
    }
    // 运行任务
    runTask(obj){
        const _ts = this;
        console.log('\r\n');
        return new Promise(async(resolve,reject)=>{
            for(let key in obj){
                _ts.taskCount++;
                console.log(key);
                echoLine('=');
                let taskList = await _ts.runList(obj[key],key);
                console.log(taskList);
            };
            resolve(_ts.taskCount);
        });
    }
    // 运行列表
    runList(list,taskName){
       const _ts = this;
       let sTime = +new Date,
            taskCount = 0,
            eTime;
        return new Promise(async(resolve,reject)=>{
            for(let i=0,len=list.length; i<len; i++){
                taskCount++;
                let item = list[i],
                    exe = item.exe,
                    task,
                    logName = taskName ? `${taskName}-${fillIn(i+1,3)}.log` : undefined;
                try {
                    task = await _ts.run(exe,item.args,logName);
                    console.log(task);
                } catch (error) {
                    console.log(error);
                    break;
                };
            };
            eTime = +new Date;
            resolve(`  有${taskCount}个子任务，共运行时长${formatTime(eTime - sTime)}\r\n`);
        });
    }
    // 运行方法
    run(exe,args,logName){
        const _ts = this;
        let option = {shell:true},
            spawn = childProcess.spawn(exe, args, option),
            logStream = logName ? fs.createWriteStream(path.join(_ts.logDir,logName)) : logName,
            writeLog = data => {
                if(logStream && data){
                    let str = data.toString();
                    logStream.write(str);
                };
            },
            sTime = +new Date,
            taskName = `${exe} ${args.join(' ')}`,
            ing = new Ing(taskName);
        ing.start();
        return new Promise((resolve,reject)=>{
            spawn.stdout.on('data', writeLog);
            spawn.stderr.on('data', writeLog);
            spawn.on('close', code => {
                ing.stop();
                let eTime = new Date,
                    time = formatTime(+eTime - sTime),
                    eTimeFormat = formatDate(+eTime);
                // 如果有日志写入流在进程结束则关闭该流
                if(logStream){
                    logStream.close();
                };

                // 正常退出
                if(code === 0) {
                    resolve(`✔ ${taskName}\r\n  结束：${eTimeFormat} ⠇ 用时：${time}\r\n`);
                // 意外退出
                }else{
                    reject(`✘ ${taskName}\r\n  结束：${eTimeFormat} ⠇ 用时：${time}\r\n`);
                };
            });
        });
    }
    // 获取任务数据
    getData(){
        const _ts = this,
            result = {};
        let taskPath = process.argv[2] || 'task.txt',
            taskPathInfo = _ts.getPathInfo(taskPath),
            getTaskObj = str => {
                let result = {},
                    re = /"[^"]*"|'[^']*'|[^ ]*/ig,
                    arr = (()=>{
                        let result = [];
                        str.match(re).forEach(item => {
                            if(item !== ""){
                                result.push(item);
                            };
                        });
                        return result;
                    })();
                if(!arr.length){
                    throw new Error('无效的执行参数');
                };
                result.exe = arr[0];
                result.args = arr.slice(1);
                return result;
            };
        
        if(taskPathInfo.type === 'file'){
            let str = fs.readFileSync(taskPath,'utf8'),
                strArr = str.split(/\r|\n/),
                titleDelimiter = '---',
                task;

            a:for(let i=0,len=strArr.length; i<len; i++){
                let item = strArr[i];
                // 行内容为标题分割符或空则跳出本次处理
                if(item === titleDelimiter || item === ""){
                    continue a;
                };
                if(strArr[i+1] === titleDelimiter){
                    task = result[item] = [];
                    i++;
                }else if(task){
                    task.push(getTaskObj(item));
                };
            };
        }else{
            throw new Error('缺少任务配置文件');
        };
        return result;
    }
    // 获取路径信息
    getPathInfo(pathStr){
        const result = {};
        try {
            let stat = fs.statSync(pathStr);
            //如果路径是一个目录，则返回目录信息
            if (stat.isDirectory()) {
                result.type = 'dir';
                result.isExist = true;
                let backPath = path.resolve(pathStr, '..'),  // 跳到路径上一级目录
                    dirName = pathStr.replace(backPath, ''), // 去除上级目录路径
                    re = /\/|\\/g;
                result.name = dirName.replace(re, '');       // 去除处理路径后的/\符号
                return result;
            };

            if (stat.isFile()) {
                result.type = 'file';
                result.isExist = true;
            };
            if (stat.isSymbolicLink()){
                result.type = 'symlink';
                result.isExist = true;
            };
        } catch (error) {
            // throw new Error(`${pathStr} 文件或目录不在磁盘上`);
        };
        result.extension = (() => {
            let extName = path.extname(pathStr);
            return extName[0] === '.' ? extName.slice(1) : extName;
        })();
        result.name = path.basename(pathStr, `.${result.extension}`);
        return result;
    }
    // 保证目录存在，并清空
    emptyDir(pathStr){
        const _ts = this;
        let pathInfo = _ts.getPathInfo(pathStr),
            eachRm;
        if(pathInfo.type === 'dir'){
            (eachRm = dir=>{
                let item = fs.readdirSync(dir);
                if(!item.length){
                    fs.rmdirSync(pathStr);
                };
                item.forEach(item => {
                    let itemPath = path.join(dir,item),
                        itemPathInfo = _ts.getPathInfo(itemPath);
                    switch (itemPathInfo.type) {
                        case 'file':
                            fs.unlinkSync(itemPath);
                        break;
                        case 'dir':
                            eachRm(itemPath);
                        break;
                    };
                });
            })(pathStr)
        }else{
            fs.mkdirSync(pathStr);
        };
    }
}

let antTask = new AntTask();
antTask.init().then(v => {
    echoLine('*');
    console.log(`共有 ${v} 个任务执行完成`);
}).catch(err => {
    echoLine('*');
    console.log('吼吼！兄得，执行出错了呢！');
    console.log(err);
});