// 変数部
let P2P_list = [];
let wolfx_list = [];
let all_data_list = [];
let log_list = [];
let converted_data_list = [];
let reconnectInterval = 1000;

//de部

// 雑務関数部
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

// コンバーター部
function converted_time(time) {
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = daysOfWeek[time.getDay()];
    const formattedTime = time.getFullYear() + '/' +
        ('0' + (time.getMonth() + 1)).slice(-2) + '/' +
        ('0' + time.getDate()).slice(-2) + '(' + dayOfWeek + ') ' +
        ('0' + time.getHours()).slice(-2) + ':' +
        ('0' + time.getMinutes()).slice(-2) + ':' +
        ('0' + time.getSeconds()).slice(-2) + '(' +
        ('0' + Math.floor(time.getMilliseconds() / 10)).slice(-2) + ")";
    return formattedTime;
}


function seismicIntensityConversion(char) {
    try {
        const intensityMap = {
            1: -3, 2: -2.5, 3: -2, 4: -1.5, 5: -1, 6: -0.5, 7: 0, 8: 0.5, 9: 1, 10: 1.5,
            11: 2, 12: 2.5, 13: 3, 14: 3.5, 15: 4, 16: 4.5, 17: 5, 18: 5.5, 19: 6, 20: 6.5, 21: 7
        };
        const intensity = char.charCodeAt(0) - 100;
        return intensityMap[intensity] !== undefined ? intensityMap[intensity] : intensity;
    } catch (error) {
        console.error(error);
    }
}

function padZero(value) {
    return value < 10 ? '0' + value : value;
}

function formatDateTimeForUrl(dateTime) {
    const year = dateTime.getFullYear();
    const month = padZero(dateTime.getMonth() + 1);
    const date = padZero(dateTime.getDate());
    const hours = padZero(dateTime.getHours());
    const minutes = padZero(dateTime.getMinutes());
    const seconds = padZero(dateTime.getSeconds());
    return `${year}${month}${date}/${year}${month}${date}${hours}${minutes}${seconds}`;
}


function wolfx_convert(data) {
    return data
}

function P2P551Convert(data) {
    const template_text = "";
    const id = data._id;
    const time = data.time;
    const issues = data.issue;
    const info_type = issues.type;
    const info_correct = issues.correct;
    const earthquake_infos = data.earthquake;
    const occurrence_time = earthquake_infos.time;
    const hypocenter_infos = earthquake_infos.hypocenter;
    const hypocenter_name = hypocenter_infos.name;
    const hypocenter_latitude = hypocenter_infos.latitude;
    const hypocenter_longitude = hypocenter_infos.longitude;
    const depth = hypocenter_infos.depth;
    const magnitude = hypocenter_infos.magnitude;
    const maxScale = earthquake_infos.maxScale;
    const domesticTsunami = earthquake_infos.domesticTsunami;
    const foreignTsunami = earthquake_infos.foreignTsunami;
    const points = data.points
    const point_text = ""
    for (const element of points) {
        point_text += `${element.pref}${element.addr}:震度${element.scale}\n`;
    }
    template_text = ```
[${info_type}]
発生時刻: ${converted_time(new Date(occurrence_time))}
震源情報 地名は${hypocenter_name}(${hypocenter_latitude},${hypocenter_longitude})で深さ${depth}km
マグニチュード:${magnitude}で最大震度:${maxScale}
津波情報 国内では${domesticTsunami} 海外では${foreignTsunami}

各地の震度
${point_text}

id:${id}/P2P発表時刻:${converted_time(new Date(time))}
```
    return template_text
}

function P2P552Convert(data) { }

function P2P555Convert(data) {
}

function P2P556Convert(data) { }
function P2P561Convert(data) {
    const template_text = "";
    id = data._id
    time = data.time
    hop = data.hop
    created_at = data.created_at
    expire = data.expire
    areas = data.areas
    const point_text = ""
    const sum_peer = 0;
    for (const element of points) {
        sum_peer += element.peer;
    }
    for (const element of points) {
        point_text += `${element.id}:${element.peer} 件\n`;
    }
    template_text = ```
作成時刻:${converted_time(new Date(created_at))}
有効期限:${converted_time(new Date(expire))}
peer数合計:${sum_peer}件

各地点のpeer数
${point_text}

id:${id}/P2P発表時刻:${converted_time(new Date(time))}
```
}
function P2P9611Convert(data) { }

// 通信中心部
const P2P_websoket_url = 'wss://api.p2pquake.net/v2/ws';
const wolfx_websoket_url = "wss://ws-api.wolfx.jp/jma_eew";

let P2P_websoket = new WebSocket(P2P_websoket_url);
let wolfx_websoket = new WebSocket(wolfx_websoket_url);

// 通信中心部
P2P_websoket.onmessage = function (event) {
    try {
        let data = JSON.parse(event.data);
        P2P_list.push(data);
        Savejson(data);
        all_data_list.push(data);
        log_list.push(`P2P data received: ${JSON.stringify(data)} `);

        // 最新データのインデックスを取得して表示
        currentIndex = all_data_list.length;
        displayMaintextareaData(currentIndex);
    } catch (error) {
        console.error("Error processing P2P WebSocket data:", error);
    }
};

wolfx_websoket.onmessage = function (event) {
    try {
        let data = JSON.parse(event.data);
        wolfx_list.push(data);
        Savejson(data);
        all_data_list.push(data);
        log_list.push(`WolfX data received: ${JSON.stringify(data)} `);

        // 最新データのインデックスを取得して表示
        currentIndex = all_data_list.length;
        displayMaintextareaData(currentIndex);
    } catch (error) {
        console.error("Error processing WolfX WebSocket data:", error);
    }
};


//作業実行部
function changetime() {
    document.getElementById("now_time").innerHTML = converted_time(now_time());
}

setInterval(changetime, 1);

function displayMaintextareaData(index) {
    const mainTextarea = document.getElementById("maintextarea");

    if (!mainTextarea) {
        console.error("Element with id 'maintextarea' not found.");
        return;
    }

    // データが存在しない場合の処理
    if (!all_data_list || all_data_list.length === 0) {
        mainTextarea.value = "データがありません。";
        return;
    }

    // インデックスが範囲外の場合の調整
    if (index < 1) index = 1;
    if (index > all_data_list.length) index = all_data_list.length;

    // 表示するデータの設定
    const selectedData = all_data_list[all_data_list.length - index];
    mainTextarea.value = `${index}/${all_data_list.length}番目のデータ\n${JSON.stringify(selectedData, null, 2)}`;

    // インデックスをグローバルに更新
    currentIndex = index;
}

// 初期インデックスを最新データに設定
let currentIndex = 1;

// 次のデータを表示する
function showNext() {
    if (currentIndex < all_data_list.length) {
        displayMaintextareaData(currentIndex + 1);
    }
}

// 前のデータを表示する
function showPrevious() {
    if (currentIndex > 1) {
        displayMaintextareaData(currentIndex - 1);
    }
}

// 初期化時に最新データを表示
document.addEventListener("DOMContentLoaded", () => {
    if (all_data_list && all_data_list.length > 0) {
        currentIndex = all_data_list.length; // 最新データのインデックス
        displayMaintextareaData(currentIndex);
    } else {
        displayMaintextareaData(1); // データがない場合の初期化
    }
});

function yahooShingenn() {
    const currentDateTime = new Date();
    const fiveSecondsAgo = new Date(currentDateTime.getTime() - 3 * 1000);
    const time_set = formatDateTimeForUrl(fiveSecondsAgo);
    const apiUrl = `https://weather-kyoshin.west.edge.storage-yahoo.jp/RealTimeData/${time_set}.json`;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", apiUrl, false);
    xhr.send();
    if (xhr.readyState === 4 && xhr.status === 200) {
        const yahoo_data = JSON.parse(xhr.responseText);
        if (yahoo_data.hypoInfo === null) {
            const dataTime=yahoo_data.realTimeData.dataTime;
            const strongEarthquake = yahoo_data.realTimeData.intensity;
            const maxstrongEarthquake = Math.max(...strongEarthquake.split('').map(char => seismicIntensityConversion(char)));
            return maxstrongEarthquake;
        }
    } else {
        console.error('リクエストが失敗しました。');
        return null; // エラー時はnullを返すなど、適切なエラー処理を行う
    }
}

function yahooShingennkooper(){
    var get_data=yahooShingenn()
    document.getElementById("yahoorealtime").textContent = `RS:${get_data}`;
}

setInterval(yahooShingennkooper, 1000);