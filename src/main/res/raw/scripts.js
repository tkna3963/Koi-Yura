// ===== グローバル変数 =====
let P2P_list = []; // P2Pサーバーからのデータを一時的に保存
let all_data_list = []; // 保存されたすべてのデータ
let log_list = []; // ログデータ
let converted_data_list = []; // フォーマット変換されたデータ
let currentIndex = 1; // 表示中のデータインデックス

// ===== 雑務関数部 =====
function now_time() {
    return new Date();
}

function speakTextAndroid(text) {
    if (typeof Android !== 'undefined' && Android.speakText) {
        Android.speakText(text);
    } else {
        console.log("Androidインターフェースが見つかりませんでした。");
    }
}

function Savejson(value) {
    const maxItems = 1000; // 最大保存件数
    const existingData = localStorage.getItem("BackupJson");
    let newData;

    if (existingData) {
        newData = JSON.parse(existingData);
        if (Array.isArray(newData)) {
            newData.push(value);
            if (newData.length > maxItems) {
                newData = newData.slice(newData.length - maxItems); // 1000件超えたら古いもの削除
            }
        } else {
            newData = [newData, value];
        }
    } else {
        newData = [value];
    }

    localStorage.setItem("BackupJson", JSON.stringify(newData));
}


//csvread
function readCSV(path) {
    const request = new XMLHttpRequest();
    request.open('GET', path, false);
    request.overrideMimeType('text/plain; charset=UTF-8');
    request.send(null);
    if (request.status === 200) {
        return request.responseText;
    } else {
        console.error(`ファイルの読み込みに失敗しました。ステータスコード: ${request.status}`);

    }
}

function getValueByCode(data, code, columnName) {
    const rows = data.split("\n").map(row => row.split(","));
    const headers = rows[0]; // ヘッダー行
    const colIndex = headers.indexOf(columnName);

    if (colIndex === -1) return "カラムが見つからない…";

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === String(code)) {
            return rows[i][colIndex] || "値なし";
        }
    }

    return "該当なし";
}

function padZero(num, length) {
    return num.toString().padStart(length, '0');
}

function converted_time(time) {
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    return `${time.getFullYear()}/${padZero(time.getMonth() + 1, 2)}/${padZero(time.getDate(), 2)}(${daysOfWeek[time.getDay()]}) ` +
        `${padZero(time.getHours(), 2)}:${padZero(time.getMinutes(), 2)}:${padZero(time.getSeconds(), 2)}(${padZero(Math.floor(time.getMilliseconds() / 10), 2)})`;
}

function koisi_facechange(path) {
    const image = document.getElementById('koisi');
    if (image) {
        image.src = path;
        console.log("画像が変更されました！");
    } else {
        console.error("Element with id 'koisi' not found.");
    }
}

let lastPlayedPath = ''; // 最後に再生したパスを記録する変数
let playCount = 0; // 再生回数をカウントする変数
let lastPlayedTime = 0; // 最後に再生した時刻を記録する変数

function Koisi_voice(path) {
    const audio = document.getElementById("koisi_voice");
    const currentTime = Date.now(); // 現在の時刻をミリ秒で取得

    // 最後に再生したパスが同じ場合
    if (path === lastPlayedPath) {
        playCount++;

        // 1回連続で同じパスは再生しない
        if (playCount >= 1) {
            // 最後に再生した時間から1秒経過しているか確認
            if (currentTime - lastPlayedTime >= audio.duration * 1000) {
                playCount = 0; // 再生回数リセット
            } else {
                console.log("同じパスは5回連続では再生しません");
                return;
            }
        }
    } else {
        playCount = 0; // パスが変わればカウントをリセット
    }

    if (audio) {
        audio.src = path;
        audio.play();
        lastPlayedPath = path; // 新しいパスを記録
        lastPlayedTime = currentTime; // 再生した時間を記録
    } else {
        console.error("Element with id 'koisi_voice' not found.");
    }
}



function koisiarrow_box_change(text) {
    const box = document.querySelector(".koisiarrow_box");
    if (box) {
        box.innerHTML = text;
    } else {
        console.error("Element with class 'koisiarrow_box' not found.");
    }
}




// ===== コンバーター部 =====


function P2P551Convert(data) {

    if (!data || typeof data !== 'object') return '無効なデータです。';
    const issueTime = data.issue?.time || '不明';
    const issueTypeEnum = {
        ScalePrompt: '震度速報',
        Destination: '震源に関する情報',
        ScaleAndDestination: '震度・震源に関する情報',
        DetailScale: '各地の震度に関する情報',
        Foreign: '遠地地震に関する情報',
        Other: 'その他の情報'
    };
    const issueType = issueTypeEnum[data.issue?.type] || '不明';

    const correctEnum = {
        None: 'なし',
        Unknown: '不明',
        ScaleOnly: '震度',
        DestinationOnly: '震源',
        ScaleAndDestination: '震度・震源'
    };
    const correct = correctEnum[data.issue?.correct] || '不明';
    const eqTime = data.earthquake?.time || '不明';
    const hypoName = data.earthquake?.hypocenter?.name || '不明';
    const latitude = data.earthquake?.hypocenter?.latitude ?? '不明';
    const longitude = data.earthquake?.hypocenter?.longitude ?? '不明';
    const depth = data.earthquake?.hypocenter?.depth ?? '不明';
    const magnitude = data.earthquake?.hypocenter?.magnitude ?? '不明';

    const scaleEnum = {
        '-1': '震度情報なし',
        10: '震度1',
        20: '震度2',
        30: '震度3',
        40: '震度4',
        45: '震度5弱',
        50: '震度5強',
        55: '震度6弱',
        60: '震度6強',
        70: '震度7'
    };
    const maxScale = scaleEnum[data.earthquake?.maxScale] || '不明';
    const tsunamiEnum = {
        None: 'なし',
        Unknown: '不明',
        Checking: '調査中',
        NonEffective: '若干の海面変動が予想されるが、被害の心配なし',
        Watch: '津波注意報',
        Warning: '津波予報(種類不明)'
    };
    const foreignTsunamiEnum = {
        None: 'なし',
        Unknown: '不明',
        Checking: '調査中',
        NonEffectiveNearby: '震源の近傍で小さな津波の可能性があるが、被害の心配なし',
        WarningNearby: '震源の近傍で津波の可能性がある',
        WarningPacific: '太平洋で津波の可能性がある',
        WarningPacificWide: '太平洋の広域で津波の可能性がある',
        WarningIndian: 'インド洋で津波の可能性がある',
        WarningIndianWide: 'インド洋の広域で津波の可能性がある',
        Potential: '一般にこの規模では津波の可能性がある'
    };
    const domesticTsunami = tsunamiEnum[data.earthquake?.domesticTsunami] || '不明';
    const foreignTsunami = foreignTsunamiEnum[data.earthquake?.foreignTsunami] || '不明';
    let pointsInfo = '';
    if (Array.isArray(data.points)) {
        pointsInfo = data.points.map(point => {
            return `  - ${point.pref}-${point.addr}:${scaleEnum[point.scale] || '不明'})`;
        }).join('\n');
    } else {
        pointsInfo = '観測データなし';
    }
    const comment = data.comments?.freeFormComment || '';
    return `
[${issueType}](訂正:${correct})
情報発表時刻: ${issueTime}

地震発生時刻:${eqTime}
震源:${hypoName} (緯度:${latitude},経度: ${longitude},深さ:${depth}km)    
最大震度:${maxScale}
マグニチュード:${magnitude}

津波の可能性:${domesticTsunami}(海外:${foreignTsunami})

各地の震度】
${pointsInfo}

${comment ? `【気象庁のコメント】\n${comment}` : ''}
;`
}


function P2P561Convert(jsonData) {
    const { _id, area, code, created_at, expire, hop, time, uid } = jsonData;
    return `
作成日時: ${created_at}
有効期限: ${expire}
投稿時間: ${time}
エリア: ${area}
コード: ${code}
ユーザーID: ${uid}
データID: ${_id}
ホップ数: ${hop}
    `;
}

function P2P555Convert(jsonData) {
    if (!jsonData || jsonData.code !== 555 || !jsonData.areas) {
        return "データが正しくありません。";
    }
    const countpeer=0;
    jsonData.areas.forEach(area => {
        countpeer +=area.peer;
    });
    let report = `受信日時: ${jsonData.time}\n\n`;
    report += `ピア合計数: ${countpeer}Peers`;
    report += `ピアの地域分布:\n`;
    jsonData.areas.forEach(area => {
        report += `- 地域コード: ${area.id}\n`;
        report += `  ピア数: ${area.peer}Peers\n`;
    });

    return report;
}

function P2P556Convert(json) {
    if (!json || json.code !== 556) {
        return "無効な緊急地震速報のデータです。";
    }

    let message = `【緊急地震速報】\n`;

    if (json.test) {
        message += `※これはテストです※\n`;
    }

    message += `受信時刻: ${json.time}\n`;

    if (json.cancelled) {
        return message + `この緊急地震速報は取り消されました。`;
    }

    if (json.earthquake) {
        const eq = json.earthquake;
        message += `地震発生時刻: ${eq.originTime}\n`;
        message += `地震発現時刻: ${eq.arrivalTime}\n`;

        if (eq.hypocenter) {
            const hypo = eq.hypocenter;
            message += `震源地: ${hypo.name} (${hypo.reduceName})\n`;
            message += `緯度: ${hypo.latitude}, 経度: ${hypo.longitude}\n`;
            message += `深さ: ${hypo.depth} km\n`;
            message += `マグニチュード: ${hypo.magnitude}\n`;
        }
    }

    if (json.issue) {
        message += `発表時刻: ${json.issue.time}\n`;
        message += `識別情報: ${json.issue.eventId}\n`;
        message += `情報番号: ${json.issue.serial}\n`;
    }

    if (json.areas && json.areas.length > 0) {
        message += `\n影響地域:\n`;
        json.areas.forEach(area => {
            const scaleMap = {
                "-1": "不明", "0": "震度0", "10": "震度1", "20": "震度2", "30": "震度3", "40": "震度4",
                "45": "震度5弱", "50": "震度5強", "55": "震度6弱", "60": "震度6強", "70": "震度7", "99": "～程度以上"
            };
            const kindMap = {
                10: "主要動未到達と予測",
                11: "主要動既到達と予測",
                19: "主要動の到達予想なし（PLUM法）"
            };
            message += `府県: ${area.pref}, 地域: ${area.name}\n`;
            message += `予測震度: ${scaleMap[area.scaleFrom]} ～ ${scaleMap[area.scaleTo]}\n`;
            message += `警報: ${kindMap[area.kindCode] || "不明"}\n`;
            if (area.arrivalTime) {
                message += `主要動到達予測時刻: ${area.arrivalTime}\n`;
            }
        });
    }

    return message;
}

function convertConfidenceToLabel(confidence) {
    if (confidence < 0) {
        return 'F';
    } else if (confidence < 0.2) {
        return 'E';
    } else if (confidence < 0.4) {
        return 'D';
    } else if (confidence < 0.6) {
        return 'C';
    } else if (confidence < 0.8) {
        return 'B';
    } else if (confidence >= 0.8) {
        return 'A';
    }
}


function P2P9611Convert(data) {
    let output = "";

    // 基本情報の出力
    output += `評価ID: ${data._id}\n`;
    output += `情報コード: ${data.code}\n`;
    output += `評価日時: ${data.time}\n`;
    output += `件数: ${data.count}\n`;
    output += `信頼度: ${convertConfidenceToLabel(data.confidence)}\n`;
    output += `開始日時: ${data.started_at}\n`;
    output += `更新日時: ${data.updated_at}\n`;

    // 地域ごとの信頼度情報の処理
    if (data.area_confidences) {
        output += `地域ごとの信頼度情報:\n`;
        for (let regionCode in data.area_confidences) {
            let area = data.area_confidences[regionCode];
            output += `地域コード: ${regionCode}\n`;
            output += `信頼度: ${convertConfidenceToLabel(area.confidence)}\n`;
            output += `件数: ${area.count}\n`;
            output += `表示: ${area.display}\n`;
        }
    }

    return output;
}

function P2P552Convert(jsonData) {
    // ヘルパー関数：Enumの意味を返す
    const getEnumDescription = (enumType, value) => {
        const enumMap = {
            grade: {
                "MajorWarning": "大津波警報",
                "Warning": "津波警報",
                "Watch": "津波注意報",
                "Unknown": "不明"
            },
            condition: {
                "ただちに津波来襲と予測": "津波が直ちに到達する予測です。",
                "津波到達中と推測": "津波が現在到達中と推測されています。",
                "第１波の到達を確認": "第1波の到達が確認されました。"
            },
            maxHeight: {
                "巨大": "非常に大きな津波が予測されます。",
                "高い": "高い津波が予測されます。",
                "１０ｍ超": "10メートルを超える津波が予測されます。",
                "１０ｍ": "約10メートルの津波が予測されます。",
                "５ｍ": "約5メートルの津波が予測されます。",
                "３ｍ": "約3メートルの津波が予測されます。",
                "１ｍ": "約1メートルの津波が予測されます。",
                "０．２ｍ未満": "0.2メートル未満の津波が予測されます。"
            }
        };
        return enumMap[enumType] && enumMap[enumType][value] ? enumMap[enumType][value] : "情報がありません";
    };

    let result = "";

    // IDとコード
    result += `津波予報ID: ${jsonData._id}\n`;
    result += `情報コード: ${jsonData.code}\n`;

    // 受信日時
    result += `受信日時: ${jsonData.time}\n`;

    // 予報のキャンセル状態
    result += `津波予報が解除されましたか: ${jsonData.cancelled ? "はい" : "いいえ"}\n`;

    // 発表元の情報
    result += `発表元: ${jsonData.issue.source}\n`;
    result += `発表日時: ${jsonData.issue.time}\n`;
    result += `発表種類: ${jsonData.issue.type}\n`;

    // 予報の詳細情報
    if (jsonData.areas && jsonData.areas.length > 0) {
        jsonData.areas.forEach(area => {
            result += `\n津波予報区名: ${area.name}\n`;
            result += `津波予報の種類: ${getEnumDescription("grade", area.grade)}\n`;
            result += `直ちに津波が来襲すると予測されていますか: ${area.immediate ? "はい" : "いいえ"}\n`;

            // 第1波の到達予想時刻
            if (area.firstHeight) {
                result += `第1波の到達予想時刻: ${area.firstHeight.arrivalTime}\n`;
                result += `到達予測状態: ${getEnumDescription("condition", area.firstHeight.condition)}\n`;
            }

            // 最大津波高さ
            if (area.maxHeight) {
                result += `最大津波高さ: ${getEnumDescription("maxHeight", area.maxHeight.description)}\n`;
                result += `予想高さ (数値表現): ${area.maxHeight.value} メートル\n`;
            }
        });
    } else {
        result += "津波予報の詳細情報はありません。\n";
    }

    return result;
}

function P2P554Convert(data) {
    if (!data._id || !data.code || !data.time || !data.type) {
        return "入力データが不完全です。";
    }

    // 時刻の整形
    let formattedTime = new Date(data.time).toLocaleString('ja-JP', { hour12: false });

    // Enumの処理
    let typeDescription = '';
    switch (data.type) {
        case 'Full':
            typeDescription = 'チャイム＋音声の検出です。';
            break;
        case 'Chime':
            typeDescription = 'チャイムのみの検出です（未実装）。';
            break;
        default:
            typeDescription = '未知の検出タイプです。';
            break;
    }

    // 結果を文章で返す
    return `
    情報ID: ${data._id}
    情報コード: ${data.code}
    受信日時: ${formattedTime}
    検出種類: ${data.type} (${typeDescription})
    `;
}

function P2PSorting(Original) {
    try {
        const codeMap = {
            551: P2P551Convert,
            552: P2P552Convert,
            554: P2P554Convert,
            555: P2P555Convert,
            556: P2P556Convert,
            561: P2P561Convert,
            9611: P2P9611Convert
        };

        return codeMap[Original.code] ? codeMap[Original.code](Original) : Original.code;
    } catch (error) {
        console.error("P2PSortingエラー:", error);
        return "エラーが発生しました";
    }
}

function wolfxcoverter(data) {

    // "heartbeat" の場合
    if (data.type === "heartbeat") {
        return `【システムハートビート】\n` +
            `ID: ${data.id}\n` +
            `メッセージ: ${data.message ? data.message : "（なし）"}\n`;
    }

    // "jma_eew" の場合 (緊急地震速報)
    if (data.type === "jma_eew") {
        let message = `【${data.Title}】\n`;
        message += `発表機関: ${data.Issue?.Source} (${data.Issue?.Status})\n`;
        message += `発表ID: ${data.EventID} / 発表回数: 第${data.Serial}報\n`;
        message += `発表時刻: ${data.AnnouncedTime} (JST)\n`;
        message += `地震発生時刻: ${data.OriginTime} (JST)\n`;
        message += `\n震源地: ${data.Hypocenter} (緯度: ${data.Latitude}, 経度: ${data.Longitude})\n`;
        message += `マグニチュード: M${data.Magunitude} 深さ: ${data.Depth}km\n`;
        message += `最大震度: ${data.MaxIntensity}\n`;

        if (data.Accuracy) {
            message += `\n【精度情報】\n`;
            message += `震源位置: ${data.Accuracy?.Epicenter} / 深さ: ${data.Accuracy?.Depth} / マグニチュード: ${data.Accuracy?.Magnitude}\n`;
        }

        if (data.MaxIntChange?.String) {
            message += `最大震度の変更: ${data.MaxIntChange.String} (理由: ${data.MaxIntChange.Reason})\n`;
        }

        if (data.WarnArea && data.WarnArea.length > 0) {
            message += `\n【警報情報】\n`;
            message += `警報対象地域: ${data.WarnArea.map(area => area.Chiiki).join("、")}\n`;
        } else {
            message += `\n【警報情報】\n警報対象地域: なし\n`;
        }

        message += `\n【その他情報】\n`;
        message += `海域の地震: ${data.isSea ? "はい" : "いいえ"}\n`;
        message += `訓練報: ${data.isTraining ? "はい" : "いいえ"}\n`;
        message += `推定震源 (PLUM/レベル/IPF法): ${data.isAssumption ? "はい" : "いいえ"}\n`;
        message += `警報発表: ${data.isWarn ? "はい" : "いいえ"}\n`;
        message += `最終報: ${data.isFinal ? "はい" : "いいえ"}\n`;
        message += `キャンセル報: ${data.isCancel ? "はい" : "いいえ"}\n`;

        if (data.OriginalText) {
            message += `\n【原文】\n${data.OriginalText}\n`;
        }

        return message;
    }

    // 未知のデータタイプの場合
    return `【未対応のデータ】\nタイプ: ${data.type}\n内容:\n${JSON.stringify(data, null, 2)}`;
}


//接続部
const P2P_websoket_url = 'wss://api.p2pquake.net/v2/ws';
let P2P_websoket;
let isWebSocketConnected = false;
let reconnectAttempts = 0;
const reconnectInterval = 1000; // 再接続のインターバル（1秒）

const wolfx_websoket_url = "wss://ws-api.wolfx.jp/jma_eew";
let wolfx_websoket = new WebSocket(wolfx_websoket_url);

wolfx_websoket.onopen = function () {
    console.log("WolfX WebSocket connected.");
}

wolfx_websoket.onmessage = function (event) {
    try {
        let data;
        data = JSON.parse(event.data);

        // データ処理
        all_data_list.push(data);
        log_list.push(`WolfX data received: ${JSON.stringify(data)}`);

        // currentIndex の更新と表示
        currentIndex = all_data_list.length;

        // 無駄な再描画を防ぐための条件（例: 現在のインデックスが変わった時だけ表示）
        if (currentIndex > 0) {
            displayMaintextareaData(currentIndex);  // P2PとWolfX両方を表示
        }

    } catch (error) {
        console.error("Error processing WolfX WebSocket data:", error);
    }
};

wolfx_websoket.onclose = function () {
    console.log("WolfX WebSocket closed.");
};

wolfx_websoket.onerror = function (error) {
    console.error("WolfX WebSocket error:", error);
};



// WebSocket接続時の処理
function createWebSocketConnection() {
    P2P_websoket = new WebSocket(P2P_websoket_url);

    P2P_websoket.onopen = function () {
        console.log("WebSocket connected.");
        isWebSocketConnected = true;
        reconnectAttempts = 0;
    };

    P2P_websoket.onmessage = function (event) {
        try {
            Koisi_voice("newpaper.wav");
            let data = JSON.parse(event.data);
            P2P_list.push(data);
            Savejson(data);
            all_data_list.push(data);
            log_list.push(`P2P data received: ${JSON.stringify(data)} `);
            isWebSocketConnected = true;
            currentIndex = all_data_list.length;
            displayMaintextareaData(currentIndex);
        } catch (error) {
            console.error("Error processing P2P WebSocket data:", error);
        }
    };

    P2P_websoket.onerror = function (error) {
        console.error("WebSocket error:", error);
        isWebSocketConnected = false;
        attemptReconnect();
    };

    P2P_websoket.onclose = function (event) {
        console.log("WebSocket closed with code: " + event.code);
        isWebSocketConnected = false;
        attemptReconnect();
    };
}

// 再接続を試みる関数
function attemptReconnect() {
    if (!isWebSocketConnected) {
        reconnectAttempts++;
        console.log(`Reconnecting... Attempt ${reconnectAttempts}`);
        setTimeout(() => {
            createWebSocketConnection();  // 新しいWebSocketインスタンスを作成
        }, reconnectInterval);
    }
}


// 接続状況を表示
function changetime() {
    const nowTimeElem = document.getElementById("now_time");
    if (nowTimeElem) {
        if (navigator.onLine) {
            if (isWebSocketConnected) {
                nowTimeElem.style.color = "#FF8C00";  // 接続が復旧した場合はオレンジ
                nowTimeElem.innerText = converted_time(now_time());
            } else {
                nowTimeElem.style.color = "red";  // WebSocketが切れている場合は赤
                nowTimeElem.innerText = "RC"; // 再接続中
            }
        } else {
            nowTimeElem.style.color = "red";  // インターネット接続がない場合は赤
            nowTimeElem.innerText = "NC"; // 接続がない場合のテキスト
        }
    }
}


// 最初にWebSocket接続を開始
createWebSocketConnection();

setInterval(changetime, 1); // 1秒ごとに時刻と接続状況を確認

let menuitemcount = 0;

function addMenuItem(text) {
    menuitemcount++;  // Correct increment of menuitemcount
    const infomenu = document.getElementById("infomenu");
    const newItem = document.createElement("p");  // Create a new <p> element
    newItem.textContent = `${menuitemcount}件目: ${text}`;  // Set the text of the new item
    infomenu.appendChild(newItem);  // Append the <p> element to the parent
}

// displayMaintextareaData関数：インデックスに基づいてテキストエリアにデータを表示
function displayMaintextareaData(index) {
    try {
        const mainTextarea = document.getElementById("maintextarea");
        const pagebar = document.getElementById("pagebar");

        if (!mainTextarea) {
            console.error("Element with id 'maintextarea' not found.");
            return;
        }

        if (!all_data_list || all_data_list.length === 0) {
            mainTextarea.value = "";
            return;
        }

        // インデックスの範囲を調整
        const validIndex = Math.min(Math.max(index, 1), all_data_list.length);
        const selectedData = all_data_list[validIndex - 1]; // 1ベース

        // P2PまたはWolfXデータを処理するためにP2PSortingとdisplayを適切に分ける
        let displayData;
        if (selectedData.code) {  // P2Pデータかどうかの確認
            displayData = P2PSorting(selectedData);
        } else {
            displayData = wolfxcoverter(selectedData);  // WolfXデータはそのまま表示
        }

        // テキストエリアにデータを表示
        mainTextarea.value = `${validIndex}/${all_data_list.length}\n${displayData}`;

        // メニュー項目を追加
        addMenuItem(`${selectedData.code || 'WolfX'}情報`);

        // 現在のインデックスを更新し、スライダーを同期
        currentIndex = validIndex;
        if (pagebar) {
            pagebar.value = validIndex;
        }
    } catch (error) {
        console.error("displayMaintextareaDataエラー:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const pagebar = document.getElementById("pagebar");

    if (!pagebar) {
        console.error("pagebar element not found!");
        return;
    }

    pagebar.addEventListener("input", (event) => {
        const selectedPage = parseInt(event.target.value, 10);
        if (isNaN(selectedPage)) {
            console.error("Invalid page number:", event.target.value);
            return;
        }
        console.log("Selected Page:", selectedPage);
        displayMaintextareaData(selectedPage);
    });

    if (all_data_list.length > 0) {
        pagebar.max = all_data_list.length; // 最大値をデータ数に設定
        pagebar.value = 1; // 初期ページを1に
        displayMaintextareaData(1);
    } else {
        console.warn("all_data_list is empty, setting pagebar max to 100.");
        pagebar.max = 100;
        pagebar.value = 1;
        displayMaintextareaData(1);
    }
});