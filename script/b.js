console.log('log b');
console.time('log b');
setTimeout(()=>{
    console.log(1);
    console.timeEnd('log b');
},1000 * 130);


// setTimeout(() => {
//     throw new Error('test');
// }, 2000);