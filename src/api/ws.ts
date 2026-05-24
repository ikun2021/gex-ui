const WS_SUB_PUBLIC = 1
const WS_UNSUB_PUBLIC = 2
const PING_INTERVAL_MS = 10_000

export interface WsSubscribeMessage {
  code: number
  topic: string
  data: string
}

type MessageListener = (data: unknown) => void

export class GexWsClient {
  private ws: WebSocket | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private readonly listeners = new Set<MessageListener>()
  private connecting: Promise<void> | null = null

  constructor(private readonly url: string) {}

  addListener(listener: MessageListener) {
    this.listeners.add(listener)
  }

  removeListener(listener: MessageListener) {
    this.listeners.delete(listener)
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN)
      return Promise.resolve()
    if (this.connecting)
      return this.connecting

    this.connecting = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url)

      ws.onopen = () => {
        this.ws = ws
        this.startPing()
        this.connecting = null
        resolve()
      }

      ws.onerror = () => {
        if (this.connecting) {
          this.connecting = null
          reject(new Error('WebSocket 连接失败'))
        }
      }

      ws.onmessage = (ev) => {
        let payload: unknown = ev.data
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload) as unknown
          }
          catch {
            /* pong 等非 JSON 文本 */
          }
        }
        for (const listener of this.listeners)
          listener(payload)
      }

      ws.onclose = () => {
        this.stopPing()
        this.ws = null
        this.connecting = null
      }
    })

    return this.connecting
  }

  subscribe(topic: string) {
    this.send({
      code: WS_SUB_PUBLIC,
      topic,
      data: '',
    })
  }

  unsubscribe(topic: string) {
    if (!topic)
      return
    this.send({
      code: WS_UNSUB_PUBLIC,
      topic,
      data: '',
    })
  }

  private send(msg: WsSubscribeMessage) {
    if (this.ws?.readyState !== WebSocket.OPEN)
      return
    this.ws.send(JSON.stringify(msg))
  }

  private sendRaw(text: string) {
    if (this.ws?.readyState !== WebSocket.OPEN)
      return
    this.ws.send(text)
  }

  private startPing() {
    this.stopPing()
    this.sendRaw('ping')
    this.pingTimer = setInterval(() => this.sendRaw('ping'), PING_INTERVAL_MS)
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  disconnect() {
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

let sharedClient: GexWsClient | null = null

export function getGexWs() {
  if (!sharedClient) {
    const url = import.meta.env.VITE_WS_URL || 'ws://dev.api.gex.com/ws'
    sharedClient = new GexWsClient(url)
  }
  return sharedClient
}
