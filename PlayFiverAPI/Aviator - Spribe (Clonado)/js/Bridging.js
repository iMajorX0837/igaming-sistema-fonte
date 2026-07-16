class HttpTaskQueue {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }
  addTask(task) {
    this.tasks.push(task);
    if (!this.isRunning) {
      this._runNext();
    }
  }
  async _runNext() {
    if (this.tasks.length === 0) {
      this.isRunning = false;
      return;
    }

    this.isRunning = true;
    const task = this.tasks.shift();

    try {
      await task();
    } catch (error) {
      console.error(error);
    } finally {
      this._runNext();
    }
  }

  get queueSize() {
    return this.tasks.length;
  }

  clearQueue() {
    this.tasks = [];
  }
}
class AvatarCache {
  cache;
  preloadQueue;
  baseUrl = "";
  constructor() {
    this.cache = new Map();
    this.preloadQueue = [];
  }
  preloadAll() {
    for (let i = 1; i <= 72; i++) {
      this.load(`assets/static/avatars/v2/av-${i}.png?v=4.2.98`);
    }
  }
  init() {
    // App served from site root (e.g. Render). Avoid "//assets/..." which
    // browsers treat as a protocol-relative host and the Python server mis-parses.
    const origin = location.origin || "";
    const parts = (location.pathname || "/").split("/").filter(Boolean);
    this.baseUrl = parts.length ? origin + "/" + parts[0] + "/" : origin + "/";
  }

  normalizeAvatarId(avatarId) {
    if (!avatarId) {
      return "assets/static/avatars/v2/av-6.png?v=4.2.98";
    }
    var id = String(avatarId).split("?")[0];
    if (id.indexOf("assets/static/avatars/") === 0) {
      return id + (String(avatarId).indexOf("?") >= 0 ? "?" + String(avatarId).split("?")[1] : "?v=4.2.98");
    }
    if (id.indexOf("av-") === 0 && id.indexOf(".png") > 0) {
      return "assets/static/avatars/v2/" + id + "?v=4.2.98";
    }
    var num = id.replace(/^av-/, "").replace(/\.png$/i, "");
    if (!Number.isNaN(Number(num))) {
      return "assets/static/avatars/v2/av-" + Math.abs(Number(num)) + ".png?v=4.2.98";
    }
    return "assets/static/avatars/v2/av-6.png?v=4.2.98";
  }
  getBlobUrl(avatarId) {
    avatarId = this.normalizeAvatarId(avatarId);
    if (this.cache.has(avatarId)) {
      return this.cache.get(avatarId);
    } else {
      return "assets/static/avatars/v2/av-31.png?v=4.2.98";
    }
  }
  async load(avatarId) {
    avatarId = this.normalizeAvatarId(avatarId);
    try {
      const blobUrl = await this.fetchAndCache(avatarId);
      this.cache.set(avatarId, blobUrl);
      return blobUrl;
    } catch (e) {
      return "assets/static/avatars/v2/av-42.png?v=4.2.98";
    }
  }
  async fetchAndCache(avatarId) {
    const response = await fetch(this.baseUrl + avatarId);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
  }
}

const ServerMethod_Login = 1;
const ServerMethod_Gamble = 1001;
const ServerMethod_Frame = 1002;
const ServerMethod_Network = 1005;
const ServerMethod_BetError = 1018;
const ServerMethod_CancelBetGamble = 2002;
const ServerMethod_GameEnd = 2003;
const ServerMethod_GameStart = 2004;
const ServerMethod_ChangeHeadIcon = 2005;
const ServerMethon_NotifyChatList = 2006;
const ServerMethod_LikeChat = 2007;
const ServerMethon_ChatHistory = 2008;
const ServerMethod_PING = 29;

(function () {
  window.AvatarCache = new AvatarCache();
  window.AvatarCache.init();
  window.AvatarCache.preloadAll();
  const CurrencySymbol = {
    AED: "د.إ",
    AFN: "؋",
    ALL: "L",
    AMD: "֏",
    ANG: "ƒ",
    AOA: "Kz",
    ARS: "A$",
    AWG: "ƒ",
    AZN: "₼",
    BAM: "Tk",
    BGN: "Tk",
    BHD: "BD",
    BIF: "Fbu",
    BMD: "$",
    BND: "B$",
    BOB: "$b",
    BRL: "R$",
    BSD: "$",
    BTN: "Nu.",
    BWP: "P",
    BYN: "BYN",
    BZD: "BZ$",
    CAD: "C$",
    CDF: "FC",
    CHF: "Fr.",
    CLP: "$",
    CNY: "¥",
    COP: "$",
    CRC: "₡",
    CUP: "₱",
    CVE: "$",
    CZK: "Kč",
    DJF: "Fdj",
    DKK: "kr.",
    DOP: "RD$",
    DZD: "DA",
    EGP: "£",
    ERN: "Nkf",
    ETB: "ብር",
    EUR: "€",
    FJD: "$",
    FKP: "£",
    GBP: "£",
    GEL: "₾",
    GHS: "GH¢",
    GIP: "£",
    GMD: "D",
    GNF: "FG",
    GTQ: "Q",
    GYD: "$",
    HKD: "HK$",
    HNL: "L",
    HTG: "G",
    HUF: "Ft",
    IDR: "Rp",
    ILS: "₪",
    INR: "₹",
    IQD: "د.ع",
    IRR: "﷼",
    ISK: "kr",
    JMD: "J$",
    JOD: "د.أ",
    JPY: "¥",
    KES: "KSh",
    KGS: "KGS",
    KHR: "៛",
    KMF: "CF",
    KPW: "₩",
    KRW: "₩",
    KWD: "ك",
    KYD: "$",
    KZT: "₸",
    LAK: "₭",
    LBP: "ل.ل",
    LKR: "₨",
    LRD: "$",
    LSL: "L",
    LYD: "LD",
    MAD: "DH",
    MDL: "L",
    MGA: "Ar",
    MKD: "ден",
    MMK: "K",
    MNT: "₮",
    MOP: "MOP$",
    MRU: "UM",
    MUR: "₨",
    MVR: "Rf.",
    MWK: "MK",
    MXN: "$",
    MYR: "RM",
    MZN: "MT",
    NAD: "$",
    NGN: "₦",
    NIO: "C$",
    NOK: "kr",
    NPR: "₨",
    NZD: "$",
    OMR: "R.O.",
    PAB: "B/.",
    PEN: "S/",
    PGK: "K",
    PHP: "₱",
    PKR: "₨",
    PLN: "zł",
    PYG: "Gs",
    QAR: "lei",
    RSD: "РСД",
    RUB: "₽",
    RWF: "FRw",
    SAR: "SR",
    SBD: "$",
    SCR: "SR",
    SDG: ".ج.س",
    SEK: "kr",
    SGD: "S$",
    SHP: "£",
    SLL: "Le",
    SOS: "S",
    SRD: "$",
    SYP: "£",
    SZL: "L",
    THB: "฿",
    TJS: "TJS",
    TMT: "T",
    TND: "د.ت",
    TOP: "T$",
    TRY: "₺",
    TTD: "TT$",
    TWD: "NT$",
    TZS: "TSh",
    UAH: "₴",
    UGX: "Ush",
    USD: "$",
    UYU: "$U",
    UZS: "so'm",
    VES: "Bs.",
    VND: "₫",
    VUV: "VT",
    WST: "$",
    XAF: "FCFA",
    XCD: "$",
    XOF: "CFA",
    XPF: "₣",
    YER: "ر.ي",
    ZAR: "R",
    ZMW: "ZK",
    TRX: "TRX",
    TUSD: "TUSD",
    USDC: "USDC",
    USDT: "₮",
  };
  var _calculateDelay = function (retryCount, baseDelay) {
    return Math.min(baseDelay * 2 ** (retryCount - 1), 30000);
  };
  var retryCondition = function (error) {
    return !error.status || (error.status >= 500 && error.status < 600);
  };

  //#region 编码
  function encodeSFSObject(obj) {
    var sfsObj = new window.SFSObject();
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var value = obj[key];
        // 特殊处理c字段，将其作为byte类型
        if (key === "c") {
          if (typeof value === "number" && Number.isInteger(value)) {
            sfsObj.putByte(key, value);
          } else if (typeof value === "string") {
            sfsObj.putUtfString(key, value); // 如果c字段是字符串则使用putUtfString
          } else {
            // 如果不是数字，则转换为数字
            sfsObj.putByte(key, parseInt(value) || 0);
          }
        }
        // 特殊处理a字段，将其作为短整型
        else if (key === "a") {
          if (typeof value === "number" && Number.isInteger(value)) {
            sfsObj.putShort(key, value);
          } else {
            // 如果不是数字，则转换为数字
            sfsObj.putShort(key, parseInt(value) || 0);
          }
        } else if (typeof value === "string") {
          sfsObj.putUtfString(key, value);
        } else if (typeof value === "number") {
          if (Number.isInteger(value)) {
            if (value >= -2147483648 && value <= 2147483647) {
              sfsObj.putInt(key, value);
            } else {
              sfsObj.putLong(key, value);
            }
          } else {
            sfsObj.putDouble(key, value);
          }
        } else if (typeof value === "boolean") {
          sfsObj.putBool(key, value);
        } else if (value === null || value === undefined) {
          // 忽略空值或未定义值
        } else if (Array.isArray(value)) {
          // 处理数组类型数据
          var sfsArray = new window.SFSArray();
          for (var i = 0; i < value.length; i++) {
            var item = value[i];
            if (typeof item === "string") {
              sfsArray.addUtfString(item);
            } else if (typeof item === "number") {
              if (Number.isInteger(item)) {
                if (item >= -2147483648 && item <= 2147483647) {
                  sfsArray.addInt(item);
                } else {
                  sfsArray.addLong(item);
                }
              } else {
                sfsArray.addDouble(item);
              }
            } else if (typeof item === "boolean") {
              sfsArray.addBool(item);
            } else if (typeof item === "object") {
              sfsArray.addSFSObject(convertToSFSObject(item));
            }
          }
          sfsObj.putSFSArray(key, sfsArray);
        } else if (typeof value === "object") {
          sfsObj.putSFSObject(key, convertToSFSObject(value));
        }
      }
    }

    // 将SFSObject转换为二进制数据
    var binaryData = sfsObj.toBinary();
    var dataLength = binaryData.byteLength;

    // 创建输出缓冲区，参考提供的onPacketWrite逻辑
    var outputBuffer = new ArrayBuffer(65535); // 分配足够大的缓冲区
    var dataView = new DataView(outputBuffer);
    var offset = 0;

    // 设置标志字节（参考onPacketWrite中的处理逻辑）
    var flags = 128; // 基础标志位
    var useCompression = false;
    var compressionThreshold = 1024; // 压缩阈值

    // 检查是否需要压缩
    if (dataLength > compressionThreshold) {
      flags += 32; // 设置压缩标志
      useCompression = true;
      // 注意：实际压缩逻辑需要根据项目中的压缩函数来实现
    }

    // 检查是否需要使用32位长度
    var useLongLength = dataLength > 65535;
    if (useLongLength) {
      flags += 8; // 设置长长度标志
    }

    // 写入标志字节
    dataView.setUint8(offset, flags);
    offset += 1;

    // 写入数据长度
    if (useLongLength) {
      dataView.setUint32(offset, dataLength, false); // 大端字节序
      offset += 4;
    } else {
      dataView.setUint16(offset, dataLength, false); // 大端字节序
      offset += 2;
    }

    // 写入二进制数据
    var uint8Array = new Uint8Array(outputBuffer);
    uint8Array.set(new Uint8Array(binaryData), offset);
    offset += dataLength;

    // 创建最终的字节数组（只包含实际需要的部分）
    var resultArray = new Uint8Array(offset);
    resultArray.set(uint8Array.slice(0, offset));

    return resultArray.buffer;
  }
  //#endregion

  //#region 解码

  async function decodeFullSFSDataPacket(dataArray) {
    // 确保数据是 Uint8Array
    let uint8Array;
    if (dataArray instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(dataArray);
    } else if (Array.isArray(dataArray)) {
      uint8Array = new Uint8Array(dataArray);
    } else if (dataArray instanceof Uint8Array) {
      uint8Array = dataArray;
    } else {
      throw new TypeError("Data must be Array, Uint8Array, or ArrayBuffer");
    }

    let dataView = new DataView(uint8Array.buffer);
    let offset = 0;

    // 读取标志字节
    const flags = dataView.getUint8(offset);
    offset += 1;

    // 是否使用32位长度
    const useLongLength = (flags & 8) !== 0;
    let dataLength = useLongLength
      ? dataView.getUint32(offset, false)
      : dataView.getUint16(offset, false);
    offset += useLongLength ? 4 : 2;

    const useCompression = (flags & 32) !== 0;

    // 提取数据部分
    let binaryData = uint8Array.slice(offset, offset + dataLength);

    // 解压缩（如果需要）
    if (useCompression) {
      if (!window.Zlib || typeof window.Zlib.Inflate !== "function") {
        console.warn("Data is compressed but Zlib.Inflate is not available.");
        return null;
      }
      try {
        // 使用 pako.inflate 解压
        binaryData = window.Zlib.Inflate(binaryData);
      } catch (e) {
        console.error("Decompression failed:", e);
        return null;
      }
    }

    // 创建 SFSObject
    if (
      !window.SFSObject ||
      typeof window.SFSObject.newFromBinaryData !== "function"
    ) {
      console.warn("SFSObject class or newFromBinaryData method not found.");
      return null;
    }

    const sfsObj = window.SFSObject.newFromBinaryData(binaryData.buffer);
    return convertSFSObjectToPlain(sfsObj);
  }

  function convertSFSObjectToPlain(obj) {
    if (obj === null || obj === undefined) return obj;

    // ⭐ 处理 Uint8Array：可能是 JSON 字符串 或 SFSObject 二进制
    if (obj instanceof Uint8Array) {
      // 尝试解析成 UTF-8 字符串
      try {
        const text = new TextDecoder().decode(obj);

        // JSON
        if (isLikelyJson(text)) {
          return convertSFSObjectToPlain(JSON.parse(text));
        }
      } catch (_) { }

      // 尝试作为 SFSObject
      try {
        const nested = window.SFSObject.newFromBinaryData(obj.buffer);
        return convertSFSObjectToPlain(nested);
      } catch (_) { }

      // 当作普通字节数组
      return obj;
    }

    // ⭐ 字符串也可能是 JSON
    if (typeof obj === "string") {
      if (isLikelyJson(obj)) {
        try {
          return convertSFSObjectToPlain(JSON.parse(obj));
        } catch (_) {
          return obj; // 解析失败就当普通字符串
        }
      }
      return obj;
    }

    // ⭐ SFSObject 内部 Map
    if (obj instanceof Map) {
      const result = {};
      for (const [key, val] of obj.entries()) {
        result[key] = convertSFSObjectToPlain(val);
      }
      return result;
    }

    // ⭐ SFSObject 节点
    if (obj._dataHolder instanceof Map) {
      return convertSFSObjectToPlain(obj._dataHolder);
    }

    // ⭐ 数组
    if (Array.isArray(obj)) {
      return obj.map(convertSFSObjectToPlain);
    }

    // ⭐ 包含 { type, value } 的结构
    if (typeof obj === "object" && obj !== null && "value" in obj) {
      return convertSFSObjectToPlain(obj.value);
    }

    return obj;
  }

  // 🔍 判断是否像 JSON（更稳，不冲字符串普通文本）
  function isLikelyJson(text) {
    if (typeof text !== "string") return false;
    const t = text.trim();
    return (
      (t.startsWith("{") && t.endsWith("}")) ||
      (t.startsWith("[") && t.endsWith("]"))
    );
  }

  //#endregion

  function isLocalMode() {
    var cfg = window.enterGameConfig || {};
    if (cfg.localMode) return true;
    var api = String(cfg.gameApi || "").toLowerCase();
    if (!api || api === "local") return true;
    return (
      api === "localhost" ||
      api.startsWith("localhost:") ||
      api === "127.0.0.1" ||
      api.startsWith("127.0.0.1:") ||
      api === window.location.host
    );
  }

  let ws;
  let _onsocketData = new Map();   //servercode=>callback
  let wsConnected = false; // 追踪WebSocket连接状态
  let wsConnecting = true; // 追踪WebSocket是否正在连接
  let wsConnectError = false; // 追踪WebSocket连接错误
  window.initWs = function (onclose) {
    if (isLocalMode() && window.LocalAviatorServer) {
      wsConnected = true;
      wsConnecting = false;
      wsConnectError = false;
      ws = {
        send: function () {},
        close: function () {},
        binaryType: "arraybuffer",
        _scope: null,
      };
      window["ws"] = ws;
      window.LocalAviatorServer.init(handlerTrunData);
      console.log("Modo local: jogo roda sem servidor externo");
      return;
    }
    //设置websocket
    ws = new WebSocket(
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.enterGameConfig.gameApi
      }/${window.enterGameConfig.apiVersion
        ? window.enterGameConfig.apiVersion + "/"
        : ""
      }ws/Aviator?account=${account}`
    );
    ws.binaryType = "arraybuffer";
    ws._scope = ws;
    window["ws"] = ws;

    ws.onopen = (e) => {
      console.log("WebSocket连接已建立");
      wsConnected = true;
      wsConnecting = false;
      wsConnectError = false;
    };

    ws.onmessage = async (e) => {
      const data = await decodeFullSFSDataPacket(e.data); //解码
      // console.log("1111111111", data);
      // console.log("收到消息result:",data.p?.body?.result)
      if (data.p?.body?.result !== 1 && data.p?.body?.result !== 0 && data.a !== 29) {
        console.log("收到错误消息:", data)
      }
      let bSendCall, callkey;
      if (data.a === ServerMethod_Gamble || data.a === ServerMethod_CancelBetGamble) {
        callkey = data.a + "" + data.p.body.betId;
        bSendCall = _onsocketData.get(callkey);
      }
      else {
        callkey = data.a;
        bSendCall = _onsocketData.get(callkey);
      }
      if (bSendCall) {
        //有这个方法说明是主动请求的响应
        if (data.a !== 29) console.log("主动请求的响应", data);
        bSendCall?.({ code: 0, data: data.p });
        _onsocketData.delete(callkey);
      } //说明是推送消息，根据a字段具体值来处理
      else {
        // console.log("收到消息推送",data);
        handlerTrunData(data);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket连接出错:", e);
      wsConnectError = true;
      wsConnecting = false;
    };

    ws.onclose = (e) => {
      console.log("WebSocket连接已关闭:", e);
      onclose?.();
      wsConnected = false;
      wsConnecting = false;
    };
  }



  var post = async function (url, data = {}, hasHeader, serverCode, needCall = true) {
    if (isLocalMode() && window.LocalAviatorServer) {
      return window.LocalAviatorServer.handleRequest(url, data, serverCode, needCall);
    }
    //修改成ws请求
    // 检查WebSocket连接状态
    if (url.includes("EnterGame")) {
      //登陆
      // 等待WebSocket连接成功
      if (!wsConnected) {
        console.log("等待WebSocket连接...");
        // 等待WebSocket连接成功
        await new Promise((resolve, reject) => {
          const checkConnection = () => {
            if (wsConnected) {
              console.log("WebSocket连接成功");
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              resolve();
            } else if (wsConnectError) {
              // WebSocket连接失败，给出提示
              console.error("WebSocket连接失败，请检查网络连接");
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              // 可以通过调用一个错误处理函数来显示界面提示
              if (window.showErrorNotification) {
                window.showErrorNotification("网络连接失败，请刷新页面重试");
              } else {
                // 如果没有定义错误提示函数，则使用alert
                // alert("网络连接失败，请刷新页面重试");
                netError();
              }
              reject({ code: -1, data: '{"result":-1}' });
            }
          };

          // 每100ms检查一次连接状态
          const intervalId = setInterval(checkConnection, 100);

          // 设置超时时间，如果超过5秒还没连接成功，则提示超时
          const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            console.error("等待WebSocket连接超时");
            if (window.showErrorNotification) {
              window.showErrorNotification("网络连接超时，请刷新页面重试");
            } else {
              // alert("网络连接超时，请刷新页面重试");
              netError();
            }
            reject({ code: -1, data: '{"result":-1}' });
          }, 5000);
        });
      }

      const parsms = {
        a: serverCode,
        c: 0,
        p: {
          p: data,
          pw: "",
          un: 0,
          zn: "",
        },
      };
      //编码
      const sendParam = encodeSFSObject(parsms);

      ws.send(sendParam);
    }
    else if (serverCode === ServerMethod_PING)  //心跳包
    {
      const sendParam = new Uint8Array([
        128, 0, 20, 18, 0, 3, 0, 1, 99, 2, 0, 0, 1, 97, 3, 0, 29, 0, 1, 112,
        18, 0, 0,
      ]);
      ws.send(sendParam);
    }
    else {
      // 对于非EnterGame请求，如果WebSocket未连接则等待
      if (!wsConnected) {
        console.log("等待WebSocket连接...");
        // 等待WebSocket连接成功（非EnterGame请求也等待连接建立）
        await new Promise((resolve, reject) => {
          const checkConnection = () => {
            if (wsConnected) {
              console.log("WebSocket连接成功");
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              resolve();
            } else if (wsConnectError) {
              // WebSocket连接失败，给出提示
              console.error("WebSocket连接失败，请检查网络连接");
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              // 可以通过调用一个错误处理函数来显示界面提示
              if (window.showErrorNotification) {
                window.showErrorNotification("网络连接失败，请检查网络连接");
              } else {
                // 如果没有定义错误提示函数，则使用alert
                //alert("网络连接失败，请检查网络连接");
                netError();
              }
              reject({ code: -1, data: '{"result":-1}' });
            }
          };

          // 每100ms检查一次连接状态
          const intervalId = setInterval(checkConnection, 100);

          // 设置超时时间，如果超过5秒还没连接成功，则提示超时
          const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            console.error("等待WebSocket连接超时");
            if (window.showErrorNotification) {
              window.showErrorNotification("网络连接超时，请检查网络连接");
            } else {
              // alert("网络连接超时，请检查网络连接");
              netError();
            }
            reject({ code: -1, data: '{"result":-1}' });
          }, 5000);
        });
      }

      const parsms = {
        a: serverCode,
        c: 0,
        p: {
          body: data,
        },
      };
      //编码
      const sendParam = encodeSFSObject(parsms);

      ws.send(sendParam);
    }
    let resData;
    await new Promise((resolve) => {
      const cursocketData = (_resData) => {
        resData = _resData;
        resolve();
      };
      if (needCall) {
        if (serverCode === ServerMethod_Gamble || serverCode === ServerMethod_CancelBetGamble) {
          _onsocketData.set(serverCode + "" + data.betId, cursocketData);
        }
        else {
          _onsocketData.set(serverCode, cursocketData);
        }
      } else {
        resolve();
      }
    });
    return resData;
  };

  var postApi = function (url, data = {}, hasHeader) {
    if (isLocalMode() && window.LocalAviatorServer) {
      return window.LocalAviatorServer.handleApi(url, data);
    }
    let retryCount = 0;
    url = url + "?account=" + window.enterGameConfig.account;
    const sendRequest = () => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        if (hasHeader) {
          xhr.setRequestHeader("Content-Type", "application/json");
        }
        xhr.onreadystatechange = function () {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status == 200 && xhr.readyState === 4) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                resolve({ code: 0, data: '{"result":-1}' }); // 如果响应不是 JSON，返回原始文本
              }
            }
          }
        };
        xhr.timeout = 20000;
        xhr.onerror = function () {
          resolve({ code: -1, data: '{"result":-1}' });
        };
        xhr.ontimeout = function (err) {
          resolve({ code: -1, data: '{"result":-1}' });
        };
        const jsonData = JSON.stringify(data);
        xhr.send(jsonData);
      });
    };
    const attempt = async () => {
      let response;
      try {
        response = await sendRequest();
        if (response.code != 0 && response.code != 200) {
          throw new Error("Response parsing failed");
        }
        return response;
      } catch (error) {
        if (retryCount < 4) {
          retryCount++;
          await new Promise((resolve, reject) => {
            setTimeout(resolve, _calculateDelay(retryCount, 1000));
          });
          return attempt();
        }
        return response;
      }
    };
    return attempt();
  };
  var GlodMultiple = 100;
  var formatRatio = function (num) {
    return +(num / GlodMultiple).toFixed(2);
  };
  var Currency = window["enterGameConfig"].currency;
  var tableData;
  function convertToSFSObject(jsObj) {
    const sfsObject = new window.SFSObject();
    for (const key in jsObj) {
      if (jsObj.hasOwnProperty(key)) {
        const value = jsObj[key];
        if (typeof value === "string") {
          sfsObject.putUtfString(key, value);
        } else if (typeof value === "number") {
          if (Number.isInteger(value)) {
            if (value >= -2147483648 && value <= 2147483647) {
              sfsObject.putInt(key, value);
            } else {
              sfsObject.putLong(key, value);
            }
          } else {
            sfsObject.putDouble(key, value);
          }
        } else if (typeof value === "boolean") {
          sfsObject.putBool(key, value);
        } else if (Array.isArray(value)) {
          sfsObject.putSFSArray(key, convertToSFSArray(value));
        } else if (typeof value === "object" && value !== null) {
          sfsObject.putSFSObject(key, convertToSFSObject(value));
        }
      }
    }
    return sfsObject;
  }

  function convertToSFSArray(jsArray) {
    const sfsArray = new window.SFSArray();
    jsArray.forEach((item) => {
      if (typeof item === "string") {
        sfsArray.addUtfString(item);
      } else if (typeof item === "number") {
        if (Number.isInteger(item)) {
          if (item >= -2147483648 && item <= 2147483647) {
            sfsArray.addInt(item);
          } else {
            sfsArray.addLong(item);
          }
        } else {
          sfsArray.addDouble(item);
        }
      } else if (typeof item === "boolean") {
        sfsArray.addBool(item);
      } else if (Array.isArray(item)) {
        sfsArray.addSFSArray(convertToSFSArray(item));
      } else if (typeof item === "object" && item !== null) {
        sfsArray.addSFSObject(convertToSFSObject(item));
      }
    });

    return sfsArray;
  }
  let taskQueue = new HttpTaskQueue();

  let trunUrl = window["enterGameConfig"]["gameApi"] + "/api/Aviator/JP";
  let intervalTimeID;

  let nowGameState = 0;
  function rondomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  let lastGameResout = {};
  function handlerTrunData(serverData) {
    if (serverData.a === ServerMethod_Gamble) {   //自动cashout
      const cashoutData = serverData.p.body;
      cashoutInGame(cashoutData.userGold, cashoutData.betUsd, cashoutData.winUsd, cashoutData.cashMul, cashoutData.betId);
    }
    else if (serverData.a === ServerMethod_Frame) {     //定时推送的游戏进程通知
      const frameData = serverData.p.body;
      transformFrameData(frameData);
    }
    else if (serverData.a === ServerMethod_Network)    //断开连接
    {
      // const sfsObj = new window.SFSObject();
      // sfsObj.putByte("dr", 1);
      // window["_onSocketData"](sfsObj);
      // onClientResponse(serverData.p)
      const rq2 = convertToSFSObject(serverData.p);
      const rqMessage2 = new window["rqMessage"](1005, 0, rq2);
      rqMessage2._content._dataHolder.set("dr", { type: 2, value: 1 })  //改成byte类型
      window["_onSocketData"](rqMessage2);
      ws.close();
    }
    else if (serverData.a === ServerMethod_GameEnd)   //游戏结束通知
    {
      const endData = serverData.p.body;
      onRoundEnd(endData);   //
      transformFrameData(endData);   //转换到下一个阶段---3
    }
    else if (serverData.a === ServerMethod_GameStart)    //游戏开始
    {
      const startData = serverData.p.body;
      onRoundStart(startData);   //
    }
    else if (serverData.a === ServerMethon_NotifyChatList)    //推送聊天列表数据
    {
      var chatBody = normalizeChatBody(serverData.p && serverData.p.body);
      if (!chatBody) return;
      var chatItems = normalizeChatMessages(chatBody);
      if (chatItems.length) {
        onNotifyChatList(chatItems);
      }
    }
    else if (serverData.a === ServerMethod_LikeChat) {
      onLikeChatMessage(serverData);
    }
    else if (
      serverData.code == -104 ||
      serverData.code == -101 ||
      serverData.code == 999 ||
      serverData.code == 200200
    ) {
      netError();
    }
    else {
      console.log("收到未知消息:", serverData)
    }
  }
  function netError() {
    taskQueue.clearQueue();
    clearInterval(intervalTimeID);
    let dt = {
      dr: 1,
      ep: [],
      ec: 28,
    };
    let rq3 = convertToSFSObject(dt);
    let rqMessage = new window.rqMessage(1, 0, rq3);
    window._onSocketData(rqMessage);
  }

  let playerData = {
    userId: "33411&&demo",
    username: "demo_40042",
    profileImage: "av-32.png",
  };
  function saveProfileImage(id) {
    let pkey =
      window["enterGameConfig"].account + playerData.userId + "ProfileImage";
    if (id) {
      localStorage.setItem(pkey, id);
      return;
    }
    let profileImage = localStorage.getItem(pkey);
    if (profileImage) {
      playerData.profileImage = profileImage;
    } else {
      let headId = rondomInt(1, 72);
      playerData.profileImage = `av-${headId}.png`;
      localStorage.setItem(pkey, playerData.profileImage);
    }
  }
  function getProfileImage() {
    let pkey =
      window["enterGameConfig"].account + playerData.userId + "ProfileImage";
    let profileImage = localStorage.getItem(pkey);
    return profileImage ?? "av-33.png";
  }
  let autoCashout = { 1: 0, 2: 0 };
  window.req = async function (Q) {
    if (Q.id == 0) {
      let content = new window.SFSObject();
      content.put("ct", 1024, 4);
      content.put("ms", 500000, 4);
      content.put("tk", "9d4f857f25749907884d7246232c7d55", 8);
      let rqMessage = new window.rqMessage(0, 0, content);
      window._onSocketData(rqMessage);
      return;
    } else if (Q.id == 1) {
      let content = new window.SFSObject();
      content.put("rs", 0, 3);
      content.put("zn", "aviator_core", 8);
      content.put("un", "33411&&demo", 8);
      content.put("pi", 0, 3);
      content.put("id", 51366197, 4);
      let ar = new window.SFSArray();
      let ar2 = new window.SFSArray();
      ar2.add(1, 4);
      ar2.add("game_state", 8);
      ar2.add("default", 8);
      ar2.add(false, 1);
      ar2.add(false, 1);
      ar2.add(false, 1);
      ar2.add(0, 3);
      ar2.add(20, 3);
      ar2.add(new window.SFSArray(), 17);
      ar.add(ar2, 17);
      content.put("rl", ar, 17);
      let rqMessage = new window.rqMessage(1, 1, content);
      window._onSocketData(rqMessage);
      let params = {
        account: window["enterGameConfig"].account,
        gameid: window["enterGameConfig"]["gameId"],
        levelid: window["enterGameConfig"]["levelid"],
        password: window["enterGameConfig"].password,
        retailId: window["enterGameConfig"].retailId,
      };
      let responseData = await post(
        window["enterGameConfig"]["gameApi"] + "/api/Aviator/EnterGame",
        params,
        null,
        ServerMethod_Login
      );
      tableData = responseData;
      console.log("enterGame", tableData);

      let rq2 = new window.SFSObject();
      rq2.put("c", "init", 8);
      if (responseData.code != 0) {
        let p = new window.SFSObject();
        p.put("code", -1, 4);
        p.put("errorMessage", "loginError", 8);
        rq2.put("p", p, 18);
        let rqMessage2 = new window.rqMessage(13, 1, rq2);
        window._onSocketData(rqMessage2);
        return;
      }

      playerData.userId = responseData.data.userid;
      playerData.username = responseData.data.NickName;
      const initData = {
        c: "init",
        p: transformInitData(responseData)
      };

      let rqMessage2 = new window.rqMessage(13, 1, convertToSFSObject(initData));
      window._onSocketData(rqMessage2);
      // startTrun();
    } else if (Q.id == 13) {
      let Handler = Q.content.get("c");
      let p = Q.content.get("p");
      if (Handler == "freeBetsArchiveHandler") {
        let dt = {
          c: "freeBetsArchive",
          p: {
            code: 200,
            isHaveMore: false,
            freeBetsArchiveInfo: [],
          },
        };
        let rq2 = convertToSFSObject(dt);
        let rqMessage2 = new window.rqMessage(13, 1, rq2);
        window._onSocketData(rqMessage2);
      } else if (Handler == "PING_REQUEST") {
        let responseData = await post("", {}, null, ServerMethod_PING);
        // console.log("发送心跳", responseData);
        let dt = {
          c: "PING_RESPONSE",
          p: {
            code: 200,
          },
        };
        let rq2 = convertToSFSObject(dt);
        let rqMessage2 = new window.rqMessage(13, 1, rq2);
        window._onSocketData(rqMessage2);
      } else if (Handler == "currentBetsInfoHandler") {
        // currentBetsInfo();   //login的时候已经返回过了，这里就不再返回
        updateInitBetAndCashout();
      } else if (Handler == "betHandler") {
        let bet = p.get("bet");
        let betId = p.get("betId");
        let clientSeed = p.get("clientSeed");
        let autoCashOut = p.get("autoCashOut") || 0;
        autoCashout[betId] = autoCashOut;
        let params = {
          gameid: window["enterGameConfig"]["gameId"],
          levelid: window["enterGameConfig"]["levelid"],
          tableid: tableData.data.tableid,
          token: tableData.data.token,
          playType: 0,
          betUsd: Math.round(bet * GlodMultiple),
          betId: betId,
          coRate: +(autoCashOut * GlodMultiple).toFixed(2),
          clientSeed: clientSeed,
        };
        console.log("押注=============", params, autoCashout);
        let responseData = await post(
          window["enterGameConfig"]["gameApi"] + "/api/Aviator/Gamble",
          params,
          null,
          ServerMethod_Gamble
        );
        // responseData = JSON.parse(responseData.data);
        responseData = responseData.data.body;
        if (!responseData || responseData.result != 1) {
          betHandlerError("bet", betId);
          return;
        }
        console.log("押注", responseData);
        placeBetInGame(responseData.userGold, responseData.betUsd, betId);
      } else if (Handler == "setPlayerSettingHandler") {
        let settingName = p.get("settingName");
        let settingValue = p.get("value");

        let dt = {
          c: "setPlayerSettingResponse",
          p: {
            code: 200,
          },
        };
        let rq2 = convertToSFSObject(dt);
        let rqMessage2 = new window.rqMessage(13, 1, rq2);
        window._onSocketData(rqMessage2);
      } else if (Handler == "changeProfileImageHandler") {
        // let profileImage = p.get("profileImage");
        // let dt = {
        //   c: "changeProfileImage",
        //   p: {
        //     code: 200,
        //     profileImageName: profileImage,
        //   },
        // };
        // let rq2 = convertToSFSObject(dt);
        // let rqMessage2 = new window.rqMessage(13, 1, rq2);
        // window._onSocketData(rqMessage2);
        // saveProfileImage(profileImage);
        let profileImage = p.get("profileImage");
        const params =
        {
          headIcon: profileImage
        }
        const response = await post(
          "",
          params,
          null,
          ServerMethod_ChangeHeadIcon
        );
        if (response.data.body.result === 1) {
          let dt = {
            c: "changeProfileImage",
            p: {
              code: 200,
              profileImageName: profileImage,
            },
          };
          onClientResponse(dt);
          saveProfileImage(profileImage);
        }
      } else if (Handler == "cashOutHandler") {
        let betId = p.get("betId");
        let currentTimestamp = p.get("currentTimestamp");
        let params = {
          gameid: window["enterGameConfig"]["gameId"],
          levelid: window["enterGameConfig"]["levelid"],
          tableid: tableData.data.tableid,
          token: tableData.data.token,
          playType: 1,
          betId: betId,
        };
        let responseData = await post(
          window["enterGameConfig"]["gameApi"] + "/api/Aviator/Gamble",
          params,
          null,
          ServerMethod_Gamble
        );
        // responseData = JSON.parse(responseData.data);
        responseData = responseData.data.body;
        console.log("cashOut", responseData);
        if (!responseData || responseData.result != 1) {
          cashOutHandlerError("cashOut", betId);
          return;
        }
        // cashOut(responseData, betId);
        cashoutInGame(responseData.userGold, responseData.betUsd, responseData.winUsd, responseData.cashMul, betId);
      } else if (Handler == "cancelBetHandler") {
        let betId = p.get("betId");
        let params =
        {
          betId: betId,
        }
        let responseData = await post(
          window["enterGameConfig"]["gameApi"] + "/api/Aviator/CancelBetGamble",
          params,
          null,
          ServerMethod_CancelBetGamble
        );
        responseData = responseData.data.body;
        if (!responseData || responseData.result != 1) {
          cancelBetHandlerError(betId);
          return;
        }
        cancelBetInGame(betId, responseData.userGold);
      } else if (Handler == "getHugeWinsInfoHandler") {
        let period = p.get("period");
        requestRankList(tableData.data.userid, Handler, period);
        // let dt = {
        //   c: "getHugeWinsInfo",
        //   p: {
        //     code: 200,
        //     topWins: [],
        //   },
        // };
        // let rq3 = convertToSFSObject(dt);
        // let rqMessage3 = new window.rqMessage(13, 1, rq3);
        // setTimeout(() => {
        //   window._onSocketData(rqMessage3);
        // }, 100);
      } else if (Handler == "getTopWinsInfoHandler") {
        let period = p.get("period");
        requestRankList(tableData.data.userid, Handler, period);
        // let dt = {
        //   c: "getTopWinsInfo",
        //   p: {
        //     code: 200,
        //     topWins: [],
        //   },
        // };
        // let rq3 = convertToSFSObject(dt);
        // let rqMessage3 = new window.rqMessage(13, 1, rq3);
        // setTimeout(() => {
        //   window._onSocketData(rqMessage3);
        // }, 100);
      } else if (Handler == "getTopRoundsInfoHandler") {
        let period = p.get("period");
        requestRankList(tableData.data.userid, Handler, period);
        //   let dt = {
        //     c: "getTopRoundsInfo",
        //     p: {
        //       code: 200,
        //       topWins: [],
        //     },
        //   };
        //   let rq3 = convertToSFSObject(dt);
        //   let rqMessage3 = new window.rqMessage(13, 1, rq3);
        //   setTimeout(() => {
        //     window._onSocketData(rqMessage3);
        //   }, 100);
      } else if (Handler == "previousRoundInfoHandler") {
        // previousRoundInfoHandler();
        setTimeout(() => {
          showLastRoundInfo.p.bets = showLastRoundInfo.p.bets.sort((a, b) => {
            return a.bet === b.bet ? a.roundBetId - b.roundBetId : (b.bet - a.bet);
          })
          onClientResponse(showLastRoundInfo);
        }, 100);
      } else if (Handler == "betHistoryHandler") {
        let lastBetId = p.get("lastBetId");
        betHistoryHandler(lastBetId);
      } else if (Handler == "serverSeedHandler") {
        serverSeedHandler();
      } else if (Handler == "roundFairnessHandler") {
        roundFairnessHandler(p.get("roundId"));
      } else if (Handler == "AddChatMessageV2Handler" || Handler == "AddChatMessageHandler")  //发送聊天
      {
        const message = String(p.get("message") || p.get("text") || "").trim();
        if (!message) return;
        const messageType = message.startsWith("/gif:") ? "gif" : "message";
        const params =
        {
          message: message,
          messageType: messageType,
        }
        const response = await post(
          window["enterGameConfig"]["gameApi"] + "/api/Aviator/Gamble",
          params,
          null,
          ServerMethon_NotifyChatList,
          true
        );
        var sendBody = normalizeChatBody(response?.data?.body);
        var sentMessages = normalizeChatMessages(sendBody);
        if (sentMessages.length) {
          onNotifyChatList(sentMessages);
        }
      } else if (Handler == "likeHandler")   //聊天点赞
      {

        const messageId = p.get("messageId")
        const blike = p.get("setLike");

        const params =
        {
          messageId: messageId,
          blike: blike,
        }

        const response = await post("", params, null, ServerMethod_LikeChat, false);
        if (response?.data?.body) {
          onLikeChatMessage(response);
        }
      }
      else {
        console.log("============", Handler);
      }
    }
  };
  async function roundFairnessHandler(roundId) {
    let data;
    if (isLocalMode() && window.LocalAviatorServer) {
      data = await window.LocalAviatorServer.getRoundFairness(roundId);
    } else {
      const url = window["enterGameConfig"]["domain2ip"] + "/history/?" + "roundId=" + roundId;
      const response = await fetch(url);
      data = await response.json();
    }
    if (!data) data = { roundId: roundId, fairness: { playerSeeds: [] } };
    if (!data.fairness) data.fairness = { playerSeeds: [] };
    if (!Array.isArray(data.fairness.playerSeeds)) data.fairness.playerSeeds = [];
    data.fairness.playerSeeds.forEach((el) => {
      if (el) el.profileImage = transformHeadIcon(el.profileImage, el);
    });
    const clientData = {
      c: "roundFairnessResponse",
      p: data,
    };
    onClientResponse(clientData);
  }
  async function generateStrings(seed) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(seed);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const segment1 = hashHex.substring(0, 16);
      const segment2 = hashHex.substring(16, 32);
      const segment3 = hashHex.substring(32, 48);

      return [
        hashHex.substring(0, 21),
        hashHex.substring(21, 42),
        hashHex.substring(42),
        (parseInt(segment1, 16) % 72) + 1,
        (parseInt(segment2, 16) % 72) + 1,
        (parseInt(segment3, 16) % 72) + 1,
      ];
    } catch (err) {
      return [
        generateRandomString(20),
        generateRandomString(20),
        generateRandomString(20),
        rondomInt(1, 72),
        rondomInt(1, 72),
        rondomInt(1, 72),
      ];
    }
  }
  async function SHA256(data) {
    try {
      const encoder = new TextEncoder();
      const buffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      return generateRandomString(40);
    }
  }

  let lastDateStamp = 0;
  let allHistyory = [];
  async function betHistoryHandler(lastBetId) {
    if (lastBetId === null) {
      lastBetId = 0;
      lastDateStamp = 0;
    }
    let params = {
      userId: tableData.data.userid,
      dateStamp: lastDateStamp,
      lastId: lastBetId,
      size: 10,
    };

    const url = window["enterGameConfig"]["domain2ip"] + "/histories";
    // const url = "http://172.17.8.9:8110/histories";
    let responseData = await postApi(
      url,
      params,
      true
    );
    if (responseData.code !== 200) {
      betHistoryError();
      return;
    }

    lastDateStamp = responseData.lastDateStamp;
    lastBetId = responseData.lastBetId;
    const { bets: bets, isMorePagesAvailable: isMorePagesAvailable, code: code } = responseData;
    let dt = {
      c: "betHistoryResponse",
      p: {
        code: 200,
        isMorePagesAvailable,
        lastBetId: lastBetId,
        bets: bets,
      },
    };
    console.log("记录", dt);
    let rq3 = convertToSFSObject(dt);
    let rqMessage3 = new window.rqMessage(13, 1, rq3);
    setTimeout(() => {
      window._onSocketData(rqMessage3);
    }, 100);
  }
  function betHistoryError() {
    let dt = {
      c: "betHistoryResponse",
      p: {
        code: 404,
        isMorePagesAvailable: false,
        lastBetId: 0,
        bets: [],
        errorMessage: "Something went wrong",
      },
    };
    let rq3 = convertToSFSObject(dt);
    let rqMessage3 = new window.rqMessage(13, 1, rq3);
    setTimeout(() => {
      window._onSocketData(rqMessage3);
    }, 100);
  }
  //取消押注错误处理
  function cancelBetHandlerError(betId) {
    let dt = {
      c: "cancelBet",
      p: {
        code: 404,
        betId: betId,
        errorMessage: "Something went wrong",
        player_id: playerData.userId.toString(),
      },
    };
    onClientResponse(dt);
  }
  function serverSeedHandler() {
    let dt = {
      c: "serverSeedResponse",
      p: {
        serverSeedSHA256: generateRandomString(64).toLowerCase(),
        code: 200,
      },
    };
    let rq3 = convertToSFSObject(dt);
    let rqMessage3 = new window.rqMessage(13, 1, rq3);
    setTimeout(() => {
      window._onSocketData(rqMessage3);
    }, 100);
  }
  function betHandlerError(handleMsg, betId) {
    let rsp = new window.SFSObject();
    rsp.putUtfString("c", handleMsg);
    let ph = new window.SFSObject();
    ph.put("code", 404, 4);
    ph.put("errorMessage", "stage time out", 8);
    ph.put("player_id", playerData.userId.toString(), 8);
    ph.put("betId", betId, 4);
    rsp.put("p", ph, 18);
    let rqMessage = new window.rqMessage(13, 1, rsp);
    window._onSocketData(rqMessage);
  }

  function cashOutHandlerError(handleMsg, betId) {
    let dt = {
      c: handleMsg,
      p: {
        code: 404,
        cashouts: [
          {
            betAmount: 0,
            winAmount: 0,
            player_id: playerData.userId.toString(),
            betId: betId,
            isMaxWinAutoCashOut: false,
          },
        ],
        multiplier: 0,
        errorMessage: "Something went wrong",
      },
    };
    let rq3 = convertToSFSObject(dt);
    let rqMessage3 = new window.rqMessage(13, 1, rq3);
    window._onSocketData(rqMessage3);
  }
  function generateRandomString(length) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }

  //发起排行榜请求
  async function requestRankList(userId, topType, dateType) {
    let rankType = ERankType.None, rankResType = "";
    if (topType === "getHugeWinsInfoHandler") {
      rankType = ERankType.WinMul;
      rankResType = "getHugeWinsInfo";
    }
    else if (topType === "getTopWinsInfoHandler") {
      rankType = ERankType.WinScore;
      rankResType = "getTopWinsInfo";
    }
    else if (topType === "getTopRoundsInfoHandler") {
      rankType = ERankType.FinalMul;
      rankResType = "getTopRoundsInfo";
    }

    dateType = dateType === "day" ? "1" : dateType === "month" ? "2" : "3";

    const url = window["enterGameConfig"]["domain2ip"] + "/toplog";
    // const url = "http://172.17.8.9:8110/toplog";
    const params =
    {
      "gameId": 0,
      "userId": userId,
      "topType": rankType,
      "dateType": dateType,
      "levelId": window["enterGameConfig"]["levelid"],
      "size": 25
    }
    const response = await postApi(url, params, true);
    if (response.code === 200) {
      if (topType === "getTopRoundsInfoHandler") {
        const clientData =
        {
          c: rankResType,
          p: {
            code: 200,
            topRounds: response.topWins,
          },

        }
        onClientResponse(clientData);
      }
      else {
        const clientData =
        {
          c: rankResType,
          p: {
            code: 200,
            topWins: response.topWins,
          },

        }
        onClientResponse(clientData);
      }
    }
  }

  //初始聊天数据
  async function getChatHistory() {
    const response = await post("", {}, undefined, ServerMethon_ChatHistory);
    console.log("收到聊天历史记录:", response);
    var body = normalizeChatBody(response?.data?.body);
    if (body?.chatMessages) {
      onNotifyChatList(body.chatMessages);
    }
  }

  //#region 转换数据
  var betTimeLeftCfg = 5000; //下注时长
  var playersBetInfo = [];
  var playerCashoutInfo = [];
  var topPlayerProfileImages = [];
  //聊天gif配置
  var gifsConfig = [
    {
      dims: [486, 498],
      id: "9431944348187876211",
      url: "https://media.tenor.com/guT_aX7923MAAAAC/cat-cute.gif"
    },
    {
      dims: [498, 286],
      id: "3913261940377549736",
      url: "https://media.tenor.com/Nk6zAF1Ce6gAAAAC/christmas-merry-christmas.gif"
    },
    {
      dims: [498, 498],
      id: "8081927309363311870",
      url: "https://media.tenor.com/cCjGEWcg9P4AAAAC/love.gif"
    },
    {
      dims: [498, 418],
      id: "10961226009468952545",
      url: "https://media.tenor.com/mB4Y-wUrX-EAAAAC/dancing-cat.gif"
    },
    {
      dims: [398, 498],
      id: "782095207471508323",
      url: "https://media.tenor.com/CtqPco3f62MAAAAC/black-guy-maid-vibe-black-maid-dance.gif"
    },
    {
      dims: [326, 480],
      id: "15837585695196795209",
      url: "https://media.tenor.com/28poR1YDUUkAAAAC/it%27s-monday-again-tweety-bird.gif"
    },
    {
      dims: [282, 498],
      id: "9760306122014173039",
      url: "https://media.tenor.com/h3OStKW5p28AAAAC/cool-fun.gif"
    },
    {
      dims: [371, 498],
      id: "16588143447578579808",
      url: "https://media.tenor.com/5jTsk-wlE2AAAAAC/monday-morning.gif"
    },
    {
      dims: [498, 422],
      id: "14491794694627035719",
      url: "https://media.tenor.com/yR0yfnMiikcAAAAC/winnie-the-pooh-movie.gif"
    },
    {
      dims: [480, 480],
      id: "18225141686872525229",
      url: "https://media.tenor.com/_Oy1zaMzSa0AAAAC/fashion-winter.gif"
    }
  ];
  var initPlayingInfo = {
    activePlayerCount: 0,
    betsCount: 0,
    openBetsCount: 0,
    totalCashOut: 0
  };
  var lastRoundInfo; //上回合数据
  var showLastRoundInfo; //展示用上回合数据
  //转换init数据
  function transformInitData(data) {
    // 处理Context可能是JSON字符串的情况
    var contextData;
    if (typeof data.data.body.Context === 'string') {
      contextData = JSON.parse(data.data.body.Context);
    }
    else {
      contextData = data.data.body.Context;
    }
    // 将服务器返回的hisMuls数组转换为roundsInfo格式
    var showRoundList = contextData.hisMuls.sort(function (a, b) { return b.roundid - a.roundid; });
    var roundsInfo = showRoundList
      .slice(0, 25) // 取最近25个数据
      .map(function (hisMul) {
        return ({
          maxMultiplier: hisMul.mul / 100, // 服务器数据需要除以100转换为小数
          roundId: hisMul.roundid
        });
      });
    console.log("showRoundList:", showRoundList);
    var headIcon = transformHeadIcon(data.data.headIcon);
    saveProfileImage(headIcon);
    // 创建用户信息
    var user = {
      settings: {
        music: true,
        sound: true,
        secondBet: true,
        animation: true
      },
      balance: formatRatio(data.data.gold), // 服务器的gold需要除以GlodMultiple转换
      profileImage: headIcon, // 使用userid生成头像
      userId: "".concat(data.data.userid),
      username: data.data.NickName
    };
    // 创建默认配置
    var config = {
      isAutoBetFeatureEnabled: true,
      betPrecision: 2,
      maxBet: 500,
      isAlderneyModalShownOnInit: false,
      isCurrencyNameHidden: false,
      isLoginTimer: false,
      isClockVisible: false,
      isBetsHistoryEndBalanceEnabled: false,
      betInputStep: 1,
      isGameRulesHaveMaxWin: false,
      isBetsHistoryStartBalanceEnabled: false,
      isMaxUserMultiplierEnabled: false,
      isShowActivePlayersWidget: true,
      backToHomeActionType: "navigate",
      inactivityTimeForDisconnect: 0,
      isActiveGameFocused: false,
      isNetSessionEnabled: false,
      fullBetTime: betTimeLeftCfg,
      minBet: 1,
      isGameRulesHaveMinimumBankValue: false,
      isShowTotalWinWidget: true,
      isShowBetControlNumber: false,
      betOptions: [10, 20, 50, 100],
      modalShownOnInit: "none",
      isLiveBetsAndStatisticsHidden: false,
      onLockUIActions: "cancelBet",
      isEmbeddedVideoHidden: false,
      isBetTimerBranded: true,
      defaultBetValue: 1,
      maxUserWin: 50000,
      isUseMaskedUsername: true,
      isShowWinAmountUntilNextRound: false,
      multiplierPrecision: 2,
      autoCashOut: { minValue: 1.01, defaultValue: 1.1, maxValue: 100 },
      isMultipleBetsEnabled: true,
      engagementTools: { isExternalChatEnabled: false },
      isFreeBetsEnabled: true,
      pingIntervalMs: 15000,
      isLogoUrlHidden: false,
      chatApiVersion: 2,
      currency: Currency,
      showCrashExampleInRules: false,
      isPodSelectAvailable: false,
      isBalanceValidationEnabled: true,
      isHolidayTheme: false,
      isGameRulesHaveMultiplierFormula: false,
      accountHistoryActionType: "navigate",
      chat: {
        promo: {
          isEnabled: true,
        },
        rain: {
          isEnabled: false,
          rainMinBet: 0.1,
          defaultNumOfUsers: 5,
          minNumOfUsers: 3,
          maxNumOfUsers: 10,
          rainMaxBet: 10,
        },
        isGifsEnabled: true,
        sendMessageDelay: 5000,
        isEnabled: true,
        maxMessages: 70,
        maxMessageLength: 160,
      },
      ircDisplayType: "modal",
      gameRulesAutoCashOutType: "default"
    };
    // 创建聊天设置
    var chatSettings = {
      top10Gifs: gifsConfig
    };
    // 创建空的聊天历史
    var chatHistory = [];
    // 从服务器时间转换为毫秒时间戳
    var serverTime = contextData.serverTime || Date.now();
    var betStateEndTime = data.data.body.Endtime !== 0
      ? data.data.body.Endtime
      : serverTime + contextData._gameStatus * 1000;
    var betTimeLeft = betStateEndTime - serverTime;
    //刷新当前的押注列表和cashout
    for (var i = 0; i < contextData.curBetInfo.length; i++) {
      var betServerInfo = contextData.curBetInfo[i];
      var clientBetInfo = convertToBetInfo(betServerInfo);
      if (clientBetInfo) playersBetInfo.push(clientBetInfo);
      if (betServerInfo.coUsd > 0) {
        var cashoutInfo = convertToCashoutInfo(betServerInfo);
        if (cashoutInfo) playerCashoutInfo.push(cashoutInfo);
      }
    }
    initPlayingInfo.activePlayerCount = contextData.playerCount || 30;
    initPlayingInfo.betsCount = contextData.currBetPlayer;
    initPlayingInfo.openBetsCount = contextData.currBetPlayer - contextData.outBetPlayer;
    initPlayingInfo.totalCashOut = contextData.TotalCashOut;
    //记录上一回合数据
    transformLastBetInfo(contextData.LastBetInfo, contextData.lastMul, {
      roundId: contextData.hisMuls && contextData.hisMuls[0] ? contextData.hisMuls[0].roundid : 0,
      roundStartDate: contextData.betStartTime || Date.now() - 30000,
      roundEndDate: contextData.serverTime || Date.now(),
    });
    showLastRoundInfo = lastRoundInfo;
    //进来初始化阶段数据
    var curGameState = contextData._gameStatus;
    if (curGameState === EGameState.Betting) {
      var startData = {};
      startData.roundId = contextData.roundId;
      startData.betStartTime = contextData.betStartTime;
      startData.gs = curGameState;
      startData.serverSeed = contextData.serverSeed;
      onRoundStart(startData);
    }
    else if (curGameState === EGameState.Playing) {
      nowGameState = EGameState.Playing;
      onClientResponse({
        c: "changeState",
        p: {
          newStateId: EGameState.Playing,
          code: 200,
          roundId: contextData.roundId,
        },
      });
      if (contextData.maxMul > 0) {
        refreshGameMul(contextData.maxMul);
      }
    }
    else if (curGameState === EGameState.Ending) {
      var endData = {};
      endData.roundId = contextData.roundId;
      endData.LastBetInfo = contextData.LastBetInfo;
      endData.userid = data.data.userid;
      endData.userGold = data.data.gold;
      endData.betStartTime = contextData.betStartTime;
      endData.maxMul = contextData.lastMul;
      endData.gs = curGameState;
      onRoundEnd(endData);
    }
    console.log("entergame contextData", contextData);
    //获取聊天历史记录
    getChatHistory();
    return {
      roundsInfo: roundsInfo,
      code: data.code,
      fullBetTime: config.fullBetTime,
      activeBets: [],
      chatHistory: chatHistory,
      activeFreeBetsInfo: [],
      betTimeLeft: betTimeLeft,
      onlinePlayers: contextData.playerCount || 30, // 使用服务器提供的玩家数量 
      chatSettings: chatSettings,
      betStateEndTime: betStateEndTime,
      serverTime: serverTime,
      user: user,
      config: config,
      roundId: contextData.roundId,
      stageId: contextData._gameStatus
    };
  }

  //更新初始下注和cashOut数据
  function updateInitBetAndCashout() {
    playersBetInfo = playersBetInfo.sort(function (a, b) { return b.bet - a.bet; }); //从大到小排序
    topPlayerProfileImages = playersBetInfo.slice(0, 3).map(function (el) { return el.profileImage; });
    var betInfoData = {
      c: "currentBetsInfo",
      p: {
        betsCount: initPlayingInfo.betsCount,
        openBetsCount: initPlayingInfo.openBetsCount,
        code: 200,
        cashOuts: playerCashoutInfo,
        bets: playersBetInfo,
        activePlayersCount: initPlayingInfo.activePlayerCount,
        topPlayerProfileImages: topPlayerProfileImages,
        totalCashOut: 0,
      },
    };
    onClientResponse(betInfoData);
    var cashoutData = {
      c: "updateCurrentCashOuts",
      p: {
        openBetsCount: initPlayingInfo.openBetsCount,
        code: 200,
        cashouts: playerCashoutInfo,
        activePlayersCount: initPlayingInfo.activePlayerCount,
        totalCashOut: formatRatio(initPlayingInfo.totalCashOut),
        topPlayerProfileImages: topPlayerProfileImages,
      },
    };
    onClientResponse(cashoutData);
    console.log("entergame initdata:", initPlayingInfo);
  }
  function resolveBetUserId(bet) {
    if (!bet || typeof bet !== "object") return null;
    var id = bet.userid != null ? bet.userid : bet.userId;
    if (id == null) return null;
    return String(id);
  }
  function isBetInfoObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    var hasUser = value.userid != null || value.userId != null;
    return hasUser && value.betId != null;
  }
  function normalizeFrameBetInfo(betInfo) {
    if (!betInfo) return [];
    if (Array.isArray(betInfo)) {
      return betInfo.filter(function (entry) { return isBetInfoObject(entry); });
    }
    if (typeof betInfo === "object") {
      if (isBetInfoObject(betInfo)) return [betInfo];
      return Object.values(betInfo).filter(function (entry) { return isBetInfoObject(entry); });
    }
    return [];
  }

  //转换帧数据
  function transformFrameData(data) {
    var _a;
    //根据当前阶段和数据的阶段执行不同的转换逻辑
    var curGameState = Number(data.gs);
    var curMul = (_a = data.maxMul) !== null && _a !== void 0 ? _a : 0;
    if (curGameState !== nowGameState) //转阶段
    {
      var clientData = void 0;
      if (curGameState === EGameState.Playing) //下注和游戏中
      {
        clientData =
        {
          c: "changeState",
          p: {
            newStateId: curGameState,
            code: 200,
            roundId: data.roundId,
          }
        };
      }
      nowGameState = curGameState;
      if (clientData) {
        onClientResponse(clientData);
      }
      if (curGameState === EGameState.Playing && curMul > 0) {
        refreshGameMul(curMul);
      }
    }
    var frameBetInfo = normalizeFrameBetInfo(data.betInfo);
    var frameDelBetInfo = normalizeFrameBetInfo(data.delBetInfo);
    if (curGameState === EGameState.Betting) //下注阶段需要刷新押注列表
    {
      updateBetList(frameBetInfo, frameDelBetInfo, data.PlayerCount, data.currBetPlayer);
    }
    if (curGameState === EGameState.Playing) {
      // 倍率必须每个 frame  atualizar (não depender de betInfo)
      if (curMul > 0) {
        refreshGameMul(curMul);
      }
      if (frameBetInfo.length || frameDelBetInfo.length) {
        updateBetList(frameBetInfo, frameDelBetInfo, data.PlayerCount, data.currBetPlayer);
      }
      if (frameBetInfo.length) {
        var cashedFrameBets = frameBetInfo.filter(function (b) {
          return (b.coUsd || 0) > 0 || (b.coRate || 0) > 0;
        });
        if (cashedFrameBets.length) {
          refreshCashoutInfo(
            cashedFrameBets,
            data.TotalCashOut,
            data.PlayerCount,
            data.currBetPlayer,
            data.outBetPlayer
          );
        }
      }
    }
  }
  //回合开始
  function onRoundStart(data) {
    var clientData = {
      c: "changeState",
      p: {
        newStateId: EGameState.Betting,
        code: 200,
        roundId: data.roundId,
      }
    };
    playersBetInfo = [];
    playerCashoutInfo = [];
    clientData.p["betStateEndTime"] = data.betStartTime + betTimeLeftCfg; //下注时间
    clientData.p["serverTime"] = data.betStartTime; //开始下注
    clientData.p["timeLeft"] = betTimeLeftCfg; //下注时间
    //刷新下注列表和cashout数据
    refreshCashoutInfo([], 0, 0, 0, 0);
    nowGameState = EGameState.Betting;
    //
    showLastRoundInfo = lastRoundInfo;
    onClientResponse(clientData);
  }
  //回合结束
  function onRoundEnd(data) {
    //记录上回合数据
    transformLastBetInfo(data.LastBetInfo, data.maxMul, {
      roundId: data.roundId,
      roundStartDate: data.betStartTime || Date.now() - 30000,
      roundEndDate: Date.now(),
    });
    var finally_x_data = {
      c: "x",
      p: {
        code: 200,
        x: formatRatio(data.maxMul),
        crashX: formatRatio(data.maxMul),
      },
    };
    onClientResponse(finally_x_data);
    var clientData = {
      c: "roundChartInfo",
      p: {
        code: 200,
        maxMultiplier: formatRatio(data.maxMul),
        roundId: data.roundId,
      }
    };
    onClientResponse(clientData);
  }
  function upsertLocalBetInList(betGold, betId) {
    var localBet = {
      bet: formatRatio(betGold || 100),
      player_id: playerData.userId.toString(),
      betId: betId || 1,
      isFreeBet: false,
      currency: Currency,
      profileImage: playerData.profileImage,
      username: playerData.username,
    };
    var betInfoIdx = playersBetInfo.findIndex(function (el) {
      return el.player_id === localBet.player_id && el.betId === localBet.betId;
    });
    if (betInfoIdx >= 0) {
      playersBetInfo[betInfoIdx] = localBet;
    } else {
      playersBetInfo.push(localBet);
    }
  }

  function pushUpdateCurrentBets(betCount, activePlayersCount) {
    playersBetInfo = playersBetInfo.sort(function (a, b) {
      return b.bet - a.bet;
    });
    topPlayerProfileImages = playersBetInfo
      .slice(0, 3)
      .map(function (betInfo) {
        return betInfo.profileImage;
      });
    onClientResponse({
      c: "updateCurrentBets",
      p: {
        betsCount:
          betCount != null ? betCount : Math.max(playersBetInfo.length, 1),
        code: 200,
        activePlayersCount:
          activePlayersCount != null
            ? activePlayersCount
            : initPlayingInfo.activePlayerCount || 1,
        bets: playersBetInfo,
        topPlayerProfileImages: topPlayerProfileImages,
      },
    });
  }

  function pushUpdateCurrentCashOuts(openBetsCount, activePlayersCount, totalCashOut) {
    onClientResponse({
      c: "updateCurrentCashOuts",
      p: {
        openBetsCount: openBetsCount != null ? openBetsCount : playersBetInfo.length,
        code: 200,
        cashouts: playerCashoutInfo,
        activePlayersCount:
          activePlayersCount != null
            ? activePlayersCount
            : initPlayingInfo.activePlayerCount || 1,
        totalCashOut: formatRatio(totalCashOut || 0),
        topPlayerProfileImages: topPlayerProfileImages,
      },
    });
  }

  //下注
  function placeBetInGame(userGold, betGold, betId) {
    //刷新余额
    var balanceData = {
      c: "newBalance",
      p: {
        code: 200,
        newBalance: formatRatio(userGold),
      },
    };
    onClientResponse(balanceData);
    //刷新下注表现
    var betData = {
      c: "bet",
      p: {
        bet: formatRatio(betGold || 100),
        code: 200,
        player_id: playerData.userId.toString(),
        freeBet: false,
        betId: betId || 1,
        profileImage: playerData.profileImage,
        username: playerData.username,
      },
    };
    onClientResponse(betData);
    upsertLocalBetInList(betGold, betId);
    pushUpdateCurrentBets(
      Math.max(playersBetInfo.length, initPlayingInfo.betsCount || 0)
    );
  }
  //取消押注
  function cancelBetInGame(betId, userGold) {
    //刷新余额
    var balanceData = {
      c: "newBalance",
      p: {
        code: 200,
        newBalance: formatRatio(userGold),
      },
    };
    onClientResponse(balanceData);
    //取消下注
    var cancelBetData = {
      c: "cancelBet",
      p: {
        betId: betId,
        code: 200,
        player_id: playerData.userId.toString(),
      }
    };
    onClientResponse(cancelBetData);
    var betIndex = playersBetInfo.findIndex(function (el) {
      return el.player_id === playerData.userId.toString() && el.betId === betId;
    });
    if (betIndex > -1) {
      playersBetInfo.splice(betIndex, 1);
    }
    pushUpdateCurrentBets(playersBetInfo.length);
  }
  //cashout
  function cashoutInGame(userGold, betUsd, winUsd, cashMul, betId) {
    //刷新余额
    var balanceData = {
      c: "newBalance",
      p: {
        code: 200,
        newBalance: formatRatio(userGold),
      },
    };
    onClientResponse(balanceData);
    //刷新cashout表现
    var cashoutData = {
      c: "cashOut",
      p: {
        code: 200,
        cashouts: [
          {
            betAmount: formatRatio(betUsd),
            winAmount: formatRatio(winUsd),
            player_id: playerData.userId.toString(),
            betId: betId,
            isMaxWinAutoCashOut: false,
          },
        ],
        multiplier: formatRatio(cashMul !== null && cashMul !== void 0 ? cashMul : 0),
      },
    };
    onClientResponse(cashoutData);
    var cashoutEntry = {
      player_id: playerData.userId.toString(),
      winAmount: formatRatio(winUsd),
      multiplier: formatRatio(cashMul !== null && cashMul !== void 0 ? cashMul : 0),
      betId: betId,
      profileImage: playerData.profileImage,
    };
    var cashoutIdx = playerCashoutInfo.findIndex(function (el) {
      return el.player_id === cashoutEntry.player_id && el.betId === betId;
    });
    if (cashoutIdx >= 0) {
      playerCashoutInfo[cashoutIdx] = cashoutEntry;
    } else {
      playerCashoutInfo.push(cashoutEntry);
    }
    upsertLocalBetInList(betUsd, betId);
    pushUpdateCurrentBets(
      Math.max(playersBetInfo.length, initPlayingInfo.betsCount || 0)
    );
    pushUpdateCurrentCashOuts(
      Math.max(playersBetInfo.length - playerCashoutInfo.length, 0),
      null,
      winUsd
    );
  }
  //刷新游戏中倍率
  function refreshGameMul(mul) {
    // console.log(new Date().getTime()+"刷新游戏中倍率",mul);
    var clientData = {
      c: "x",
      p: {
        code: 200,
        x: formatRatio(mul),
      }
    };
    onClientResponse(clientData);
  }
  //TODO 更新押注列表
  function updateBetList(betInfos, delBetInfos, activePlayersCount, betCount) {
    betInfos = betInfos || [];
    delBetInfos = delBetInfos || [];
    if (!betInfos.length && !delBetInfos.length) {
      return;
    }
    var changed = false;
    var _loop_1 = function (i) {
      var betInfo = betInfos[i];
      var betUserId = resolveBetUserId(betInfo);
      if (!betUserId || betInfo.betId == null) return;
      var betInfoIdx = playersBetInfo.findIndex(function (el) { return el.player_id === betUserId && el.betId === betInfo.betId; });
      var findBetInfo = playersBetInfo[betInfoIdx];
      if (findBetInfo) {
        var nextBet = formatRatio(betInfo.betUsd);
        var nextUsername = betInfo.name;
        var nextProfile = transformHeadIcon(betInfo.iocn);
        if (
          findBetInfo.bet !== nextBet ||
          findBetInfo.username !== nextUsername ||
          findBetInfo.profileImage !== nextProfile
        ) {
          findBetInfo.bet = nextBet;
          findBetInfo.username = nextUsername;
          findBetInfo.profileImage = nextProfile;
          changed = true;
        }
      }
      else {
        var curBetInfo = convertToBetInfo(betInfo);
        if (curBetInfo) {
          playersBetInfo.push(curBetInfo);
          changed = true;
        }
      }
    };
    for (var i = 0; i < betInfos.length; i++) {
      _loop_1(i);
    }
    var _loop_2 = function (i) {
      var delBetInfo = delBetInfos[i];
      var delUserId = resolveBetUserId(delBetInfo);
      if (!delUserId || delBetInfo.betId == null) return;
      var betIndex = playersBetInfo.findIndex(function (el) { return el.player_id === delUserId && el.betId === delBetInfo.betId; });
      if (betIndex > -1) {
        playersBetInfo.splice(betIndex, 1);
        changed = true;
      }
    };
    //删除下注列表数据
    for (var i = 0; i < delBetInfos.length; i++) {
      _loop_2(i);
    }
    if (!changed) {
      return;
    }
    playersBetInfo = playersBetInfo.sort(function (a, b) { return b.bet - a.bet; }); //从小到大排序
    topPlayerProfileImages = playersBetInfo.slice(0, 3).map(function (betInfo) { return betInfo.profileImage; });
    var clientData = {
      c: "updateCurrentBets",
      p: {
        betsCount: betCount != null ? betCount : playersBetInfo.length,
        code: 200,
        activePlayersCount: activePlayersCount,
        bets: playersBetInfo,
        topPlayerProfileImages: topPlayerProfileImages,
      },
    };
    // console.log("更新押注信息:",clientData)
    onClientResponse(clientData);
  }
  //TODO 更新cashout信息
  function refreshCashoutInfo(betInfos, totalCashOut, activePlayersCount, betCount, cashoutCount) {
    betInfos = betInfos || [];
    var added = false;
    var _loop_3 = function (i) {
      var betInfo = betInfos[i];
      if (!betInfo) return;
      if ((betInfo.coUsd || 0) <= 0 && (betInfo.coRate || 0) <= 0) return;
      var playerId = resolveBetUserId(betInfo);
      if (!playerId) return;
      var findBetInfoIdx = playerCashoutInfo.findIndex(function (el) { return el.player_id === playerId && el.betId === betInfo.betId; });
      var findBetInfo = playerCashoutInfo[findBetInfoIdx];
      if (!findBetInfo) {
        var curCashout = convertToCashoutInfo(betInfo);
        if (curCashout) {
          playerCashoutInfo.push(curCashout);
          added = true;
        }
      }
    };
    // return;
    for (var i = 0; i < betInfos.length; i++) {
      _loop_3(i);
    }
    // Sem cashouts novos: não reemitir (UI reaplica winAmount e o fundo verde fica piscando)
    if (!added && betInfos.length > 0) {
      return;
    }
    topPlayerProfileImages = playersBetInfo.slice(0, 3).map(function (betInfo) { return betInfo.profileImage; });
    var clientData = {
      c: "updateCurrentCashOuts",
      p: {
        openBetsCount: betCount - cashoutCount,
        code: 200,
        cashouts: playerCashoutInfo,
        activePlayersCount: activePlayersCount,
        totalCashOut: formatRatio(totalCashOut),
        topPlayerProfileImages: topPlayerProfileImages,
      },
    };
    // console.log("更新cashout信息:",clientData)
    onClientResponse(clientData);
  }
  //转换上一局的押注信息
  function transformLastBetInfo(lastServerBetInfos, maxMul, roundMeta) {
    var lastRoundBetInfos = [];
    var meta = roundMeta || {};
    var rid = meta.roundId || 0;
    for (var i = 0; i < lastServerBetInfos.length; i++) {
      var lastServerBetInfo = lastServerBetInfos[i];
      var lastBetInfo = {
        bet: formatRatio(lastServerBetInfo.betUsd),
        roundBetId: rid ? rid * 10 + i : i + 1,
        winAmount: formatRatio(lastServerBetInfo.coUsd),
        payout: formatRatio(lastServerBetInfo.coRate),
        isFreeBet: false,
        currency: Currency,
        profileImage: transformHeadIcon(lastServerBetInfo.iocn),
        win: lastServerBetInfo.coUsd > 0,
        username: lastServerBetInfo.name,
      };
      lastRoundBetInfos.push(lastBetInfo);
    }
    lastRoundInfo =
    {
      c: "previousRoundInfoResponse",
      p: {
        roundInfo: {
          multiplier: formatRatio(maxMul !== null && maxMul !== void 0 ? maxMul : 0),
          roundStartDate: meta.roundStartDate || Date.now() - 30000,
          roundEndDate: meta.roundEndDate || Date.now(),
          roundId: rid || 0,
        },
        code: 200,
        bets: lastRoundBetInfos,
      }
    };
  }
  function convertToBetInfo(betInfo) {
    var playerId = resolveBetUserId(betInfo);
    if (!playerId) return null;
    return {
      bet: formatRatio(betInfo.betUsd || 0),
      player_id: playerId,
      betId: betInfo.betId,
      isFreeBet: false,
      currency: Currency,
      profileImage: transformHeadIcon(betInfo.iocn),
      username: betInfo.name || "Player",
    };
  }
  //转换cashout数据
  function convertToCashoutInfo(betInfo) {
    var playerId = resolveBetUserId(betInfo);
    if (!playerId) return null;
    return {
      player_id: playerId,
      winAmount: formatRatio(betInfo.coUsd || 0),
      multiplier: formatRatio(betInfo.coRate || 0),
      betId: betInfo.betId,
      profileImage: transformHeadIcon(betInfo.iocn),
    };
  }
  function transformHeadIcon(headIcon) {
    headIcon = headIcon || "6";
    headIcon = String(headIcon).split("?")[0];
    if (headIcon.indexOf("assets/") === 0) {
      return headIcon;
    }
    if (headIcon.indexOf("av-") === 0 && headIcon.indexOf(".png") > 0) {
      return headIcon;
    }
    var num = headIcon.replace(/^av-/, "").replace(/\.png$/i, "");
    if (!Number.isNaN(Number(num))) {
      return "av-" + Math.abs(Number(num)) + ".png";
    }
    return headIcon.indexOf("av") >= 0 ? headIcon : "av-" + headIcon + ".png";
  }
  function normalizeChatBody(body) {
    if (!body) return null;
    if (body instanceof Uint8Array) {
      try {
        return JSON.parse(new TextDecoder().decode(body));
      } catch (_e) {
        return null;
      }
    }
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (_e) {
        return null;
      }
    }
    return body;
  }
  //转换聊天列表数据
  var seenChatMessages = new Map();
  function onNotifyChatList(chatData) {
    chatData = dedupeChatMessages(normalizeChatMessages(chatData));
    var _loop_4 = function (oneChat) {
      if (oneChat.messageType !== "gif")
        return "continue";
      var gidConfig = gifsConfig.find(function (el) { return String(oneChat.message || "").includes(el.id); });
      if (!gidConfig)
        gidConfig = gifsConfig[Math.floor(Math.random() * gifsConfig.length)]; //找不到就用随机代替
      var gifInfo = {
        dims: gidConfig.dims,
        url: gidConfig.url,
        id: gidConfig.id,
      };
      oneChat.gifInfo = gifInfo;
      oneChat.message = "";
    };
    //检查是否有gif
    for (var _i = 0, chatData_1 = chatData; _i < chatData_1.length; _i++) {
      var oneChat = chatData_1[_i];
      _loop_4(oneChat);
    }
    var clientData = {
      c: "AddChatMessages",
      p: {
        code: 200,
        messages: chatData.map(function (el) {
          var rawText = String(
            el.message ??
            el.text ??
            el.content ??
            (el.body && (el.body.message || el.body.text)) ??
            ""
          ).trim();
          if (rawText) {
            el.message = rawText;
            el.text = rawText;
          }
          el.messageId = el.messageId || el.id || Date.now();
          el.id = el.messageId;
          el.playerName = el.playerName || el.senderName || el.username || el.name || "Jogador";
          el.senderName = el.senderName || el.playerName;
          el.username = el.username || el.playerName;
          el.senderPlayerId = el.senderPlayerId || el.userId || el.player_id || "";
          el.messageType = el.messageType || "message";
          el.senderType = !el.senderType || el.senderType === "user" ? "PLAYER" : el.senderType;
          el.createDate = el.createDate || el.time || Date.now();
          if (!el.likes || typeof el.likes !== "object") {
            el.likes = {
              isMeLiked: false,
              usersLikesNumber: Number(el.likes || 0),
            };
          }
          el.profileImage = transformHeadIcon(
            el.profileImage || el.senderAvatar || el.avatar || el.iocn || el.headIcon || "6"
          );
          el.senderAvatar = transformHeadIcon(el.senderAvatar || el.profileImage || "6");
          el.playerAvatar = el.playerAvatar || el.senderAvatar || el.profileImage;
          return el;
        })
      },
    };
    onClientResponse(clientData);
  }

  function dedupeChatMessages(messages) {
    var now = Date.now();
    return messages.filter(function (message) {
      var id = message && (message.messageId || message.id);
      var signature = [
        message?.senderPlayerId || message?.userId || message?.player_id || "",
        message?.message || message?.text || "",
      ].join(":");
      var key = id ? "id:" + id : "sig:" + signature;
      var sigKey = "sig:" + signature;

      if ((seenChatMessages.has(key) && now - seenChatMessages.get(key) < 5000) ||
        (seenChatMessages.has(sigKey) && now - seenChatMessages.get(sigKey) < 1500)) {
        return false;
      }

      seenChatMessages.set(key, now);
      seenChatMessages.set(sigKey, now);
      if (seenChatMessages.size > 200) {
        seenChatMessages = new Map(Array.from(seenChatMessages.entries()).slice(-100));
      }
      return true;
    });
  }

  function normalizeChatMessages(chatData) {
    if (Array.isArray(chatData))
      return chatData;

    var candidates = [
      chatData?.chatMessages,
      chatData?.messages,
      chatData?.body?.chatMessages,
      chatData?.body?.messages,
      chatData?.data?.chatMessages,
      chatData?.data?.messages,
      chatData?.data?.body?.chatMessages,
      chatData?.data?.body?.messages,
      chatData?.p?.chatMessages,
      chatData?.p?.messages,
      chatData?.p?.body?.chatMessages,
      chatData?.p?.body?.messages,
    ];

    for (var i = 0; i < candidates.length; i++) {
      if (Array.isArray(candidates[i]))
        return candidates[i];
    }

    if (chatData && typeof chatData === "object" && typeof chatData.length === "number") {
      return Array.prototype.slice.call(chatData);
    }

    if (chatData && typeof chatData === "object") {
      var values = Object.values(chatData);
      if (values.every(function (item) { return item && typeof item === "object"; }))
        return values;
    }

    return [];
  }
  //聊天点赞
  function onLikeChatMessage(data) {
    var likeData =
      (data && data.data && data.data.body) ||
      (data && data.p && data.p.body) ||
      (data && data.body) ||
      data ||
      {};
    var clientData = {
      c: "like",
      p: {
        code: 200,
        messageId: likeData.messageId,
        usersLikesNumber: likeData.usersLikesNumber != null
          ? likeData.usersLikesNumber
          : (likeData.blike ? 1 : 0),
      }
    };
    onClientResponse(clientData);
  }
  //客户端游戏响应
  function onClientResponse(clientData) {
    var rq2 = convertToSFSObject(clientData);
    var rqMessage2 = new window["rqMessage"](13, 1, rq2);
    window["_onSocketData"](rqMessage2);
  }
  var EGameState;
  (function (EGameState) {
    EGameState[EGameState["None"] = 0] = "None";
    EGameState[EGameState["Betting"] = 1] = "Betting";
    EGameState[EGameState["Playing"] = 2] = "Playing";
    EGameState[EGameState["Ending"] = 3] = "Ending";
    EGameState[EGameState["Finished"] = 4] = "Finished";
  })(EGameState || (EGameState = {}));
  //排行榜类型
  var ERankType;
  (function (ERankType) {
    ERankType["None"] = "0";
    ERankType["WinMul"] = "1";
    ERankType["WinScore"] = "2";
    ERankType["FinalMul"] = "3";
  })(ERankType || (ERankType = {}));
  //#endregion

})();
