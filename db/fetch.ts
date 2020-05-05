import { AjaxArgsType,RequestType } from './interface'

export function ajax(options:AjaxArgsType) {
    return new Promise((resolve,reject) => {
        let { data = {},type,query = {},url } = options
        const {
            'with-credentials': withCredentials,
            headers = {},
            cache = 'default',
            timeout,
            successStatusRange,
            transformData,
            cancelToken
        } = options

        const ContentType = headers['Content-Type'] || (headers['Content-Type'] = data instanceof FormData ? 'multipart/form-data' : 'application/x-www-form-urlencoded')

        if(cancelToken) {
            cancelToken(() => {
                reject('__FETCH_CANCEL')
            })    
        }

        type = type.toUpperCase() as RequestType

        if(type === 'GET') {
            query = {
                ...data,
                ...query
            }
            if(Object.keys(data).length && Object.keys(query).length) url = handleQuery(url,query)
        } else {
            data = formatData(ContentType,data)
        } 

        if(typeof fetch === 'undefined') {
            let xhr = new XMLHttpRequest()
            if(type === 'GET') {
                xhr.open('get',url)
            } else if(type === 'POST') {
                xhr.open('post',url)
            }
            
            for(let header in headers) {
                xhr.setRequestHeader(header,headers[header])
            }

            if(timeout) xhr.timeout = timeout
            xhr.withCredentials = withCredentials

            // 不为multipart/form-data设置c-t
            ContentType !== 'multipart/form-data' && xhr.setRequestHeader('Content-Type',ContentType ? ContentType : type === 'POST' ? 'application/x-www-form-urlencoded' : 'application/json')
            
            xhr.send(type === 'GET' ? '' : data as any as string) 

            xhr.ontimeout = function(e) {
                reject(e)
            }

            xhr.onreadystatechange = function() {
                let requestPerfStart
                switch (xhr.readyState) {
                    case XMLHttpRequest.OPENED: {
                        requestPerfStart = performance.now()
                        break
                    }
                    case XMLHttpRequest.DONE: {
                        let consume = performance.now() - requestPerfStart

                        checkStatus(successStatusRange,xhr.status) ? resolve({
                            ... options.perf ? { __consumeTime: consume } : {},
                            status: xhr.status,
                            data: xhr.response
                        }) : reject({
                            ... options.perf ? { __consumeTime: consume } : {},
                            status: xhr.status,
                            errMsg: xhr.response
                        })
                        break
                    }
                }
            }
        } else {
            const opts = {
                headers,
                method: type,
                ... type !== 'GET' ? { body: data instanceof FormData ? data : JSON.stringify(data) } : {},
                cache,
                credentials: handleCredentials(withCredentials)
            }

            if(ContentType === 'multipart/form-data') delete headers['Content-Type']
            console.log(opts)

            if(timeout) {
                if(typeof AbortController !== 'undefined') {
                    const controller = new AbortController()
                    opts['signal'] = controller.signal

                    fetchAndHandle()

                    setTimeout(() => {
                        controller.abort()
                        reject(new Error('fetch timeout'))
                    },timeout)
                } 
                else {
                    Promise.race([
                        fetchAndHandle(),
                        new Promise(_ => {
                            setTimeout(() => reject(new Error('timeout')),timeout)
                        })
                    ])
                }
            } else fetchAndHandle()

            function fetchAndHandle():Promise<unknown> {
                return fetch(url,opts).then(r => handleResult(r)).then(r => {
                    if(transformData && typeof transformData === 'function') {
                        r = transformData(r)
                    } else new Error('transformData isn\'t a function')

                    resolve(r)
                }).catch(e => {
                    reject(e)
                })
            }

            function handleResult(res:Response) {
                const handleContentTypeMap = {
                    'application/json': () => res.json(),
                    'application/javascript': () => true,
                    'application/html': () => res.text(),
                    'application/text': () => res.text(),
                }

                if(successStatusRange ? checkStatus(successStatusRange,res.status) : res.ok) {
                    let ret = handleContentTypeMap[res.headers['contentType'] || res.headers['content-type']]
                    return ret && ret() || res.text()
                } else {
                    const error = {
                        state: 'fail',
                        status: res.status,
                    }
                    throw new Error(JSON.stringify(error))
                }
            }
        }
    })
    
}

// TODO: 支持strict模式
function handleCredentials(opt:boolean,none:boolean = true):RequestCredentials {
    // chrome 最新版本要求same-site:lax(不发送绝大多数第三方cookie)
    // 可手动设置为include(None)或Strict
    if(opt) return none ? 'include' : 'same-origin'
    else return 'omit'
}

function handleQuery(url:string,query:object):string {
    return url + '?' + formatKV(query)
}

function checkStatus(range,status):boolean {
    if(range && (range as []).pop) {
        if(status >= range[0] && status < range[1]) return true
    } 
    return range === status ? true : false
}

function formatData(type:string,data:object):any{
    let r 
    switch(type) {
        case 'multipart/form-data': {
            if(data instanceof FormData) {
                r = data
                break
            }

            r = new FormData()
            Object.keys(data).forEach(key => {
                r.append(key,data[key])
            })
            
            break
        }
        case 'application/x-www-form-urlencoded' :{
            r = formatKV(data)
            break
        } 
        default: {}
        case 'application/json': {
            r = JSON.stringify(data)
        }
    }

    return r
}

function formatKV(data:object) {
    let r = ''
    for(let k in data) {
        r += `${k}=${data[k]}&`
    }
    return r.substring(0,r.length - 1)
}