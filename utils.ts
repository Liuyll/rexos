interface IUtils {
    extend(target:unknown,ext:object, isDeep ?: boolean)
    safeJsonParse(target:string):object
    safeJsonStringify(target:object): string
    isSupportPreload():boolean
    isArray<T=any>(t):t is Array<T>
    isObject<T=any>(t):t is Object
}

function extend(target:unknown,exts:object, isDeep:boolean = false) {
    for(let ext in exts) {
        if(isDeep) {
            if(Object.prototype.hasOwnProperty.call(target, ext) && isObject(target[ext]) && isObject(exts[ext])) {
                extend(target[ext], exts[ext], true)
                continue
            }
        }
        target[ext] = exts[ext]
    }
}

function isObject<T=any>(t: any):t is Object{
    return Object.prototype.toString.call(t) === '[object Object]'
}

function isArray<T=any>(t:any):t is Array<T>{
    return Object.prototype.toString.call(t) === '[object Array]'
}

function safeJsonParse(target:string):object{
    let ret:object
    try {
        ret = JSON.parse(target)
    } catch(e) {
        ret = {
            __transform: 'fail',
            __raw: target
        }
    }
    return ret
}

function safeJsonStringify(target:object):string {
    let ret:object | string
    try {
        ret = JSON.stringify(target)
    } catch(e) {
        ret = 'transform fail'
    }
    return ret
}

function isSupportPreload() {
    return (
        document.createElement('link').relList &&
        document.createElement('link').relList.supports('preload')
    )
}

const _:IUtils = {
    isArray,
    isObject,
    extend,
    safeJsonParse,
    isSupportPreload,
    safeJsonStringify
}


export default _

