// ===== グローバル変数 =====
let P2P_list = []; // P2Pサーバーからのデータを一時的に保存
let all_data_list = []; // 保存されたすべてのデータ
let log_list = []; // ログデータ
let converted_data_list = []; // フォーマット変換されたデータ
let reconnectInterval = 5000; // WebSocket再接続間隔（ms）
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
    const existingData = localStorage.getItem("BackupJson");
    let newData;
    if (existingData) {
        newData = JSON.parse(existingData);
        if (Array.isArray(newData)) {
            newData.push(value);
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
function convertDate(date) {
    return converted_time(new Date(date));
}

function P2P551Convert(data) {
    const { _id, time, issue, earthquake } = data;
    const { type: info_type, earthquake: { time: occurrence_time, hypocenter, maxScale } } = data;
    const point_text = data.points.map(point => `${point.pref}${point.addr}:震度${point.scale}`).join('\n');

    return `[${info_type}]
発生時刻: ${convertDate(occurrence_time)}
震源情報: ${hypocenter.name}(${hypocenter.latitude}, ${hypocenter.longitude}), 深さ${hypocenter.depth}km, マグニチュード:${hypocenter.magnitude}, 最大震度:${maxScale}
津波情報: 国内-${earthquake.domesticTsunami}, 海外-${earthquake.foreignTsunami}

各地の震度:
${point_text}

id:${_id} / P2P発表時刻: ${convertDate(time)}`;
}

function P2P555Convert(data) {
    if (!data._id || !data.code || !data.time || !data.areas) return "データに必要な情報が足りません。";

    const result = [
        `ID: ${data._id}`,
        `コード: ${data.code}`,
        `受信日時: ${data.time}`,
        '地域分布情報:',//getValueByCode(readCSV("epsparea.csv"),area.id,"地域")
        ...data.areas.map(area => area.id && area.peer !== undefined ? `地域コード: ${area.id}, ピア数: ${area.peer}` : "不完全な地域データがあります。")
    ];

    return result.join("\n");
}

function P2P9611Convert(data) {
    const { _id, code, time, count, confidence, started_at, updated_at, area_confidences } = data;

    const result = [
        `評価日時: ${time}`,
        `評価ID: ${_id}`,
        `情報コード: ${code}`,
        `件数: ${count}`,
        `信頼度: ${confidence}`,
        `開始日時: ${started_at}`,
        `更新日時: ${updated_at}`,
        '地域ごとの信頼度:',
        ...Object.entries(area_confidences).map(([regionCode, region]) =>
            `地域コード: ${regionCode}\n信頼度: ${region.confidence}\n件数: ${region.count}\n信頼度表示: ${region.display}`
        )
    ];

    return result.join("\n");
}

function P2P556Convert(data) {
    const { _id, code, time, earthquake, issue, cancelled, areas } = data;
    const report = [
        `緊急地震速報（警報）`,
        `ID: ${_id}`,
        `コード: ${code}`,
        `受信日時: ${time}`,
        `テスト: ${data.test ? 'はい' : 'いいえ'}`,
        earthquake && `地震情報:
  発生時刻: ${earthquake.originTime}
  震源情報: ${earthquake.hypocenter?.name}`,
        issue && `発表情報:
  発表時刻: ${issue.time}
  イベントID: ${issue.eventId}`,
        cancelled !== undefined && `取消: ${cancelled ? 'あり' : 'なし'}`,
        areas && areas.length && `細分区域:
${areas.map(area =>
            `府県予報区: ${area.pref}\n地域名: ${area.name}\n最大予測震度: ${area.scaleFrom}～${area.scaleTo}\n警報コード: ${area.kindCode}\n予測時刻: ${area.arrivalTime}`
        ).join("\n\n")}`
    ];

    return report.filter(Boolean).join("\n");
}

function P2P552Convert(data) {
    const { _id, code, time, cancelled, issue, areas } = data;
    const report = [
        `津波予報`,
        `ID: ${_id}`,
        `コード: ${code}`,
        `受信日時: ${time}`,
        `津波予報解除: ${cancelled ? '解除' : '有効'}`,
        issue && `発表元情報:
  発表元: ${issue.source}
  発表日時: ${issue.time}
  発表種類: ${issue.type}`,
        areas && areas.length && `津波予報詳細:
${areas.map(area =>
            `予報区名: ${area.name}\n予報種類: ${area.grade}\n直ちに津波来襲: ${area.immediate ? 'はい' : 'いいえ'}\n第1波の到達予想時刻: ${area.firstHeight?.arrivalTime}\n予想される津波の高さ: ${area.maxHeight?.description}, ${area.maxHeight?.value}m`
        ).join("\n\n")}`
    ];

    return report.filter(Boolean).join("\n");
}

function P2PSorting(Original) {
    try {
        const codeMap = {
            "551": P2P551Convert,
            "555": P2P555Convert,
            "9611": P2P9611Convert,
            "556": P2P556Convert,
            "552": P2P552Convert
        };

        return codeMap[Original.code] ? codeMap[Original.code](Original) : Original.code;
    } catch (error) {
        console.error("P2PSortingエラー:", error);
        return "エラーが発生しました";
    }
}



// ===== 通信中心部 =====
const P2P_websoket_url = 'wss://api.p2pquake.net/v2/ws';

let P2P_websoket = new WebSocket(P2P_websoket_url);

P2P_websoket.onmessage = function (event) {
    try {
        Koisi_voice("newpaper.wav");
        let data = JSON.parse(event.data);
        P2P_list.push(data);
        Savejson(data);
        all_data_list.push(data);
        log_list.push(`P2P data received: ${JSON.stringify(data)} `);
        document.getElementById("now_time").style.color = "green";
        currentIndex = all_data_list.length;
        displayMaintextareaData(currentIndex);
    } catch (error) {
        console.error("Error processing P2P WebSocket data:", error);
    }
};

P2P_websoket.onerror = function (error) {
    console.error("WebSocket error:", error);
    reconnectWebSocket();
};

P2P_websoket.onclose = function () {
    console.log("WebSocket closed. Attempting to reconnect...");
    reconnectWebSocket();
};

function reconnectWebSocket() {
    setTimeout(() => {
        P2P_websoket = new WebSocket(P2P_websoket_url);
        P2P_websoket.onmessage = P2P_websoket.onmessage;
        P2P_websoket.onerror = P2P_websoket.onerror;
        P2P_websoket.onclose = P2P_websoket.onclose;
    }, reconnectInterval);
}

// ===== 作業実行部 =====
function changetime() {
    const nowTimeElem = document.getElementById("now_time");
    if (nowTimeElem) {
        nowTimeElem.innerText = converted_time(now_time());
        nowTimeElem.style.color = "#83FF39";
    }
}

setInterval(changetime, 1);

function addMenuItem(text) {
    const infomenu = document.getElementById("infomenu");
    const newItem = document.createElement("p"); // 新しい<p>を作成
    newItem.textContent = text; // テキストを設定
    infomenu.appendChild(newItem); // 親要素に追加
}

// displayMaintextareaData関数：インデックスに基づいてテキストエリアにデータを表示
function displayMaintextareaData(index) {
    try {
        const mainTextarea = document.getElementById("maintextarea");

        if (!mainTextarea) {
            console.error("Element with id 'maintextarea' not found.");
            return;
        }

        if (!all_data_list || all_data_list.length === 0) {
            mainTextarea.value = "";
            return;
        }

        // インデックスが範囲内か確認
        const validIndex = Math.min(Math.max(index, 1), all_data_list.length);
        const selectedData = all_data_list[validIndex - 1]; // インデックスは1ベース

        // テキストエリアにデータを表示
        mainTextarea.value = `${validIndex}/${all_data_list.length}\n${P2PSorting(selectedData)}`;

        // メニュー項目を追加
        addMenuItem(`${selectedData.code}情報-${selectedData.time}`);
        currentIndex = validIndex;
    } catch (error) {
        console.error("displayMaintextareaDataエラー:", error);
    }
}

// ページバーの値が変更された時の処理
document.addEventListener("DOMContentLoaded", () => {
    const pagebar = document.getElementById("pagebar");

    if (!pagebar) {
        console.error("pagebar element not found!");
        return;
    }

    pagebar.addEventListener("input", (event) => {
        const selectedPage = parseInt(event.target.value, 10);
        console.log("Selected Page:", selectedPage);
        displayMaintextareaData(selectedPage);
    });

    if (all_data_list && all_data_list.length > 0) {
        pagebar.max = all_data_list.length-1;
        pagebar.value = 1;
        displayMaintextareaData(1);
    } else {
        console.warn("all_data_list is empty, setting pagebar max to 100.");
        pagebar.max = 100;
        pagebar.value = 1;
        displayMaintextareaData(1);
    }
});