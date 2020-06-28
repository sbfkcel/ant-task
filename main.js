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
    echoLine = str => console.log(new Array(60).join(str)),
    arrDelItem = (arr,delContent) => {
        let result = [];
        arr.forEach(item => {
            if(item !== delContent){
                result.push(item);
            };
        });
        return result;
    },
    packageObj = require('./package.json'),
    // 获取路径信息
    getPathInfo = pathStr => {
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
    },
    cwdPath = process.cwd();

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
        _ts.stdout.clearLine && _ts.stdout.clearLine();
        _ts.stdout.write('\r');
        clearInterval(_ts.loop);
    }
    update(){
        const _ts = this;
        _ts.stdout.clearLine && _ts.stdout.clearLine();
        _ts.stdout.write(_ts.getText());
    }
    getText(){
        const _ts = this;
        let result = `\r${_ts.iconStr[_ts.index % _ts.iconStr.length]} ${_ts.str}   [${formatTime(+new Date - _ts.sTime)}]`;
        _ts.index++;
        return result;
    }
}

class TaskData{
    constructor(taskPath){
        const _ts = this;
        _ts.path = taskPath;
        _ts.nexusTree = {};
    }
    /**
     * 检查是否为死循环嵌套
     * @returns {string|undefined} 存在死循环嵌套的文件路径
     */
    isLimited(){
        const _ts = this,
            checkList = {};
        for(let key in _ts.nexusTree){
            let child = _ts.nexusTree[key].child;
            checkList[key] = null;
            for(let _key in child){
                if(checkList[_key] !== undefined){
                    return key;
                };
            };
        };
        return false;
    }

    /**
     * 获取任务文本内容
     * @returns {string}
     */
    getStr(){
        const _ts = this;
        let result,
            getTaskStr;
        result = (getTaskStr = (filePath,dirPath)=>{
            let isLimited = _ts.isLimited();
            if(isLimited){
                throw new Error(`${isLimited} 存在死循环套用`);
            };
            filePath = path.join(dirPath,filePath);
            _ts.nexusTree[filePath] =  _ts.nexusTree[filePath] || {};
            _ts.nexusTree[filePath]['child'] = _ts.nexusTree[filePath]['child'] || {};

            let filePathInfo = getPathInfo(filePath);
            if(filePathInfo.type === 'file'){
                let fileContent = fs.readFileSync(filePath,'utf8') + '\r\n';
                fileContent = fileContent.replace(/([\r\n]@include|^@include)(\s{1,})(.*)/ig,item => {
                    let fileArr = item.match(/(@include)(\s{1,})(.*)/i),
                        fileName = fileArr[fileArr.length - 1].replace(/"|'/ig,''),
                        fileDir = path.join(dirPath,...(fileName.split('/')),'..'),
                        itemFilePath = path.join(fileDir,fileName);
                    _ts.nexusTree[filePath]['child'][itemFilePath] = null;
                    return getTaskStr(fileName,fileDir);
                });
                return fileContent;
            }else{
                throw new Error(`${filePath} 文件不存在`);
            };
        })(_ts.path,cwdPath);
        return result;
    }
    /**
     * 获取任务数据
     * @returns {object} 任务数据
     */
    getObj(){
        const _ts = this;
        let result,
            taskStr = _ts.getStr(),
            strArr = arrDelItem(taskStr.split(/\r|\n/),''),
            titleDelimiter = new Array(4).join('-'),
            getTaskObj = str => {
                let result = {},
                    re = /"[^"]*"|'[^']*'|[^ ]*/ig,
                    arr = arrDelItem(str.match(re),'');
                if(!arr.length){
                    throw new Error('无效的执行参数');
                };
                result.exe = arr[0];
                result.args = arr.slice(1);
                return result;
            },
            task,
            isIgnore;
        a:for(let i=0,len=strArr.length; i<len; i++){
            let item = strArr[i];
            if(item === titleDelimiter){            // 如果 title 被注释了，则内任务内容可被忽略
                isIgnore = true;
            };
            if(
                /^(\s{0,}[#@])/i.test(item) ||      // 如果是注释或保留关键字
                item === titleDelimiter ||          // 或是 title
                item === ""                         // 又或者是任务内容为空，都跳出本次处理
            ){
                continue a;
            };
            
            if(strArr[i+1] === titleDelimiter){
                isIgnore = false;
                result = result || {};
                task = result[`task_${item}`] = [];
                i++;
            }else if(task && !isIgnore){
                task.push(getTaskObj(item));
            };
        };
        return result;
    }
}

class AntTask{
    constructor(){
        const _ts = this;
        _ts.cwdPath = process.cwd();
        
        _ts.logDir = process.argv[2] ? path.join(process.argv[2],'..','antTaskLogs') : 'antTaskLogs';
        _ts.taskCount = 0;
    }
    /**
     * 任务初始化方法
     */
    async init(){
        const _ts = this;
        let taskConfigPath = process.argv[2];
        if(taskConfigPath && taskConfigPath[0] === "-"){
            switch (taskConfigPath.toLocaleLowerCase()) {
                case '-v':
                case '--version':
                    console.log(packageObj.version);
                break;
                default:
                    console.log(`确保当前目录下是否有默认任务配置文件 "task.txt"\r\n或指定任务配置文件，例如：atask "home/task.txt"`);
                break;
            };
            return;
        };
        try {
            _ts.data = _ts.getData(taskConfigPath);
            if(!_ts.data){
                console.log('任务内容为空');
                return;
            };
            _ts.emptyDir(_ts.logDir);
            return await _ts.runTask(_ts.data);
        } catch (error) {
            throw error;
        };
    }
    /**
     * 运行任务方法
     * @param {object} obj 任务数据
     * @returns {promise}
     */
    runTask(obj){
        const _ts = this;
        return new Promise(async(resolve,reject)=>{
            for(let key in obj){
                _ts.taskCount++;
                let taskName = key.slice(5);
                console.log(taskName);
                echoLine('=');
                let taskList = await _ts.runList(obj[key],taskName);
                console.log(taskList);
            };
            resolve(_ts.taskCount);
        });
    }
    /**
     * 运行一个任务列表
     * @param {array} list 任务列表
     * @param {string} taskName 任务名称
     * @returns {promise}
     */
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
    /**
     * 运行方法
     * @param {string} exe 程序执行方式
     * @param {array} args 执行参数
     * @param {string} logName 任务日志名称
     * @returns {promise}
     */
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
    /**
     * 获取任务数据
     * @param {string} taskConfigPath 任务配置文件路径
     * @returns {object}  任务数据
     */
    getData(taskConfigPath){
        const _ts = this;
        let taskPath = taskConfigPath || 'task.txt',
            taskPathInfo = getPathInfo(taskPath);
        if(taskPathInfo.type === 'file'){
            return new TaskData(taskPath).getObj();
        }else{
            console.log('任务配置文件不存在');
        };
    }
    
    /**
     * 保证目录存在，并清空
     * @param {string} pathStr 目录路径
     */
    emptyDir(pathStr){
        const _ts = this;
        let pathInfo = getPathInfo(pathStr),
            eachRm;
        if(pathInfo.type === 'dir'){
            (eachRm = dir=>{
                let item = fs.readdirSync(dir);
                if(!item.length){
                    fs.rmdirSync(pathStr);
                };
                item.forEach(item => {
                    let itemPath = path.join(dir,item),
                        itemPathInfo = getPathInfo(itemPath);
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
    if(!v){
        return;
    };
    echoLine('*');
    console.log(`共有 ${v} 个任务执行完成`);
}).catch(err => {
    echoLine('*');
    console.log('吼吼！兄得，出错了呢！');
    console.log(err);
});