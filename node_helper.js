const NodeHelper = require("node_helper");
const dgram = require("dgram");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = NodeHelper.create({
  start: function () {
    this.config = null;
    this.udpServer = dgram.createSocket("udp4");
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.initMusicCast();
    }
  },

  initMusicCast: async function () {
    // 1. 기기 정보 가져오기 (Model Name 등)
    await this.getDeviceInfo();
    
    // 2. 초기 상태 가져오기 및 구독 시작
    this.updateStatus();

    // 3. UDP 리스너 시작 (Port 41100)
    this.startUdpListener();

    // 4. 주기적 Keep-alive (구독 유지)
    setInterval(() => {
      this.updateStatus();
    }, this.config.updateInterval);
  },

  getDeviceInfo: async function () {
    try {
      const res = await fetch(`http://${this.config.device_ip}/YamahaExtendedControl/v1/system/getDeviceInfo`);
      const data = await res.json();
      this.sendSocketNotification("DEVICE_INFO", data);
    } catch (e) {
      console.error("[MMM-MusicCastInfo] Error fetching device info:", e);
    }
  },

  updateStatus: async function () {
    try {
      // X-AppName, X-AppPort 헤더를 넣어 기기가 이 IP로 이벤트를 보내도록 유도
      const res = await fetch(`http://${this.config.device_ip}/YamahaExtendedControl/v1/main/getStatus`, {
        headers: {
          "X-AppName": "MusicCast/1",
          "X-AppPort": "41100"
        }
      });
      const data = await res.json();
      if (data.response_code === 0) {
        this.sendSocketNotification("STATUS_UPDATE", data);
      }
    } catch (e) {
      console.error("[MMM-MusicCastInfo] Error updating status:", e);
    }
  },

  startUdpListener: function () {
    this.udpServer.on("message", (msg, rinfo) => {
      console.log(`[MMM-MusicCastInfo] UDP Event received from ${rinfo.address}`);
      // 상태 변화 이벤트가 오면 즉시 최신 정보를 HTTP로 다시 긁어옴
      this.updateStatus();
    });

    this.udpServer.on("error", (err) => {
      console.error(`[MMM-MusicCastInfo] UDP Error: ${err.stack}`);
    });

    this.udpServer.bind(41100, "0.0.0.0");
  }
});