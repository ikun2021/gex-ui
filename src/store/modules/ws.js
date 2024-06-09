import {defineStore} from "pinia";


export const userWebSocket = defineStore('webSocketConn', () => {
    const conn = ref({})
    let  klineDataHandler
    let  depthDataHandler
    let  tickDataHandler
    let  tickerDataHandler
    let  orderDataHandler

    let setKlineDataHandler=(h)=>{
        klineDataHandler=h
    }

    let setDepthDataHandler=(h)=>{
        depthDataHandler=h
    }

    let setTickDataHandler=(h)=>{
        tickDataHandler=h
    }

    let setTickerDataHandler=(h)=>{
        tickerDataHandler = h
    }
    let setOrderDataHandler=(h)=>{
        orderDataHandler = h
    }


    const tickTopic = 'tick'
    const tickerTopic = 'ticker'
    const depthTopic = 'depth'
    const klineTopic = 'kline'
    const orderTopic = 'order'
    const initConn = async () => {
        conn.value= await new Promise((resolve, reject) => {
            let socket = new WebSocket("ws://192.168.2.160/ws")
            socket.onopen = () => {
                console.log('websocket connect!')
                resolve(socket)
            }
            socket.onerror = (error) => {
                console.log('websocket connect failed')
                reject(error)
            }
            socket.onmessage = (data)=>{
                let resp = JSON.parse(data.data)
                if (resp.code >= 20000) {
                    return
                }
                let prefix = resp.t.split("@")[0]
                switch (prefix) {
                    case klineTopic:
                        klineDataHandler(resp)
                        break
                    case depthTopic:
                        depthDataHandler(resp)
                        break
                    case tickTopic:
                        tickDataHandler(resp)
                        break
                    case tickerTopic:
                        tickerDataHandler(resp)
                        break
                    case orderTopic:
                        orderDataHandler(resp)
                        break
                }
            }
        })
    }

    initConn()




    return {
        conn,
        setKlineDataHandler,
        setDepthDataHandler,
        setTickDataHandler,
        setTickerDataHandler,
        setOrderDataHandler,
    }
}, {persist: false})
