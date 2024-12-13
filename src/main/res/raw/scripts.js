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

P2P_websoket.onmessage = function (event) {
    try {
        let data = JSON.parse(event.data);
        P2P_list.push(data);
        Savejson(data);
        all_data_list.push(data);
        log_list.push(`P2P data received: ${JSON.stringify(data)} `);

        displayMaintexTareaAllData()

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

        displayMaintexTareaAllData()

    } catch (error) {
        console.error("Error processing WolfX WebSocket data:", error);
    }
};


//作業実行部
function changetime() {
    document.getElementById("now_time").innerHTML = converted_time(now_time());
}

setInterval(changetime, 1);


//all_data_listの中身をmaintextareaに表示
function displayMaintexTareaAllData() {
    const mainTextarea = document.getElementById("maintextarea");
    if (mainTextarea) {
        mainTextarea.value = JSON.stringify(all_data_list, null, 2);
    } else {
        console.error("Element with id 'maintextarea' not found.");
    }
}

