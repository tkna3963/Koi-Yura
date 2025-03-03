// 雑務処理関数群

// 現在の時間を取得する関数
function now_time() {
    return new Date();
}

// ゼロ埋め処理
function padZero(number, length) {
    return String(number).padStart(length, '0');
}
// 時間の形式を変換する関数（日本語形式）
function timeConvert(time, type) {
    if (type === "ja") {
        const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
        return `${time.getFullYear()}/${padZero(time.getMonth() + 1, 2)}/${padZero(time.getDate(), 2)}(${daysOfWeek[time.getDay()]}) ` +
            `${padZero(time.getHours(), 2)}:${padZero(time.getMinutes(), 2)}:${padZero(time.getSeconds(), 2)}(${padZero(Math.floor(time.getMilliseconds() / 10), 2)})`;
    } else {
        return time;  // 日本語形式以外ならそのまま返す
    }
}

// デバッグツール群
// ログ出力関数
function LogPrinter(test, functionName, level = "INFO") {
    const levels = {
        INFO: "情報",  // 情報
        WARN: "警告",  // 警告
        ERROR: "エラー"  // エラー
    };

    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${levels[level] || "情報"}【${functionName}】[${timestamp}] ${test}`;
    console.log(logMessage);
}

// ログリスト出力関数
function loglistPrinter(data, indent = 0) {
    let result = "";
    const prefix = "  ".repeat(indent); // インデント設定

    if (Array.isArray(data)) {
        // 配列の場合
        for (let i = 0; i < data.length; i++) {
            result += prefix + "- " + loglistPrinter(data[i], indent + 1);
        }
    } else if (typeof data === "object" && data !== null) {
        // オブジェクトの場合
        for (let key in data) {
            result += prefix + key + ":\n" + loglistPrinter(data[key], indent + 1);
        }
    } else {
        // その他の場合
        result += prefix + data + "\n";
    }
    return result;
}

//コンバート軍

function jsonconvert(data, type) {
    if (type === "text") { return JSON.stringify(data); }
    if (type === "json") { return JSON.parse(data); }
}


function dictionaryConverter(word) {
    const enums = {
        ScalePrompt: '震度速報', Destination: '震源に関する情報', ScaleAndDestination: '震度・震源に関する情報',
        DetailScale: '各地の震度に関する情報', Foreign: '遠地地震に関する情報', Other: 'その他の情報',
        None: 'なし', Unknown: '不明', ScaleOnly: '震度', DestinationOnly: '震源',
        ScaleAndDestination: '震度・震源', Checking: '調査中', NonEffective: '若干の海面変動が予想されるが、被害の心配なし',
        Watch: '津波注意報', Warning: '津波予報(種類不明)',
        NonEffectiveNearby: '震源の近傍で小さな津波の可能性があるが、被害の心配なし',
        WarningNearby: '震源の近傍で津波の可能性がある', WarningPacific: '太平洋で津波の可能性がある',
        WarningPacificWide: '太平洋の広域で津波の可能性がある', WarningIndian: 'インド洋で津波の可能性がある',
        WarningIndianWide: 'インド洋の広域で津波の可能性がある', Potential: '一般にこの規模では津波の可能性がある',
        "-1": "不明", "0": "震度0", "10": "震度1", "20": "震度2", "30": "震度3", "40": "震度4",
        "45": "震度5弱", "50": "震度5強", "55": "震度6弱", "60": "震度6強", "70": "震度7", "99": "～程度以上",
        10: "主要動未到達と予測", 11: "主要動既到達と予測", 19: "主要動の到達予想なし（PLUM法）",
        MajorWarning: "大津波警報", TsunamiWarning: "津波警報", TsunamiWatch: "津波注意報",
        "ただちに津波来襲と予測": "津波が直ちに到達する予測です。",
        "津波到達中と推測": "津波が現在到達中と推測されています。",
        "第１波の到達を確認": "第1波の到達が確認されました。",
        "巨大": "非常に大きな津波が予測されます。", "高い": "高い津波が予測されます。",
        "１０ｍ超": "10メートルを超える津波が予測されます。", "１０ｍ": "約10メートルの津波が予測されます。",
        "５ｍ": "約5メートルの津波が予測されます。", "３ｍ": "約3メートルの津波が予測されます。",
        "１ｍ": "約1メートルの津波が予測されます。", "０．２ｍ未満": "0.2メートル未満の津波が予測されます。"
    };
    return enums[word] || "不明";
}

// 通信関連部
function URLrequester(URL) {
    const request = new XMLHttpRequest();
    request.open('GET', URL, false);
    request.overrideMimeType('text/plain; charset=UTF-8');
    request.send(null);
    const status = request.status;
    const response = request.response;
    const readyState = request.readyState;
    const statusText = request.statusText;
    const responseText = request.responseText;
    return { "status": status, "response": response, "readyState": readyState, "statusText": statusText, "responseText": responseText };
}


// WebSocketクライアント関数
function WebSocketClient(URL) {
    let reconnectAttempts = 0;
    function handleOpen() {
        LogPrinter(`WebSocket接続成功: ${URL}`, "WebSocketClient", "INFO");
        reconnectAttempts = 0; // 再接続カウントリセット
    }
    function handleMessage(event) {
        LogPrinter(`受信データ: ${event.data} (${URL})`, "WebSocketClient", "INFO");
    }
    function handleClose(event) {
        LogPrinter(`WebSocket切断: ${URL} - コード: ${event.code}, 理由: ${event.reason}`, "WebSocketClient", "INFO");
        attemptReconnect();
    }
    function handleError(event) {
        LogPrinter(`WebSocketエラー: ${JSON.stringify(event)} (${URL})`, "WebSocketClient", "ERROR");
    }
    function attemptReconnect() {
        const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000); // 最大30秒
        reconnectAttempts++;
        LogPrinter(`再接続試行: ${URL}（${delay / 1000}秒後）`, "WebSocketClient", "INFO");
        setTimeout(connect, delay);
    }
    function connect() {
        const socket = new WebSocket(URL);

        socket.onopen = () => handleOpen();
        socket.onmessage = (event) => handleMessage(event);
        socket.onclose = (event) => handleClose(event);
        socket.onerror = (event) => handleError(event);
    }
    connect(); // 初回接続
}

WebSocketClient("wss://api.p2pquake.net/v2/ws");
WebSocketClient("wss://ws-api.wolfx.jp/jma_eew");
