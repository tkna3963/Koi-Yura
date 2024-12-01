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
    if (data.type === "jma_eew") {
        return data
    } else {
        return ""
    }
}

function P2P551Convert() { }
function P2P552Convert() { }
function P2P555Convert() { }
function P2P556Convert() { }
function P2P561Convert() { }
function P2P9611Convert() { }

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
        log_list.push(`P2P data received: ${JSON.stringify(data)}`);
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
        log_list.push(`WolfX data received: ${JSON.stringify(data)}`);
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
function displayAllData() {
    const mainTextarea = document.getElementById("maintextarea");
    if (mainTextarea) {
        mainTextarea.value = JSON.stringify(all_data_list, null, 2);
    } else {
        console.error("Element with id 'maintextarea' not found.");
    }
}

setInterval(displayAllData, 1);
