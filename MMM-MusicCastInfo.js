Module.register("MMM-MusicCastInfo", {
  defaults: {
    device_ip: "192.168.0.232", // 기본 IP
    updateInterval: 60000,       // Keep-alive 및 상태 갱신 주기 (ms)
  },

  start: function () {
    this.status = null;
    this.deviceName = "Connecting...";
    // node_helper에 설정 전달 및 시작 신호
    this.sendSocketNotification("CONFIG", this.config);
  },

  getStyles: function () {
    return ["MMM-MusicCastInfo.css"];
  },

  // node_helper로부터 데이터를 받았을 때 처리
  socketNotificationReceived: function (notification, payload) {
    if (notification === "DEVICE_INFO") {
      this.deviceName = payload.model_name;
      this.updateDom();
    } else if (notification === "STATUS_UPDATE") {
      this.status = payload;
      this.deviceMaxVolDecimal = payload.max_volume
      this.updateDom();
    }
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "musiccast-wrapper";

    if (!this.status) {
      wrapper.innerHTML = "Loading MusicCast...";
      return wrapper;
    }

    const name = document.createElement("div");
    name.className = "device-name bright medium";
    name.innerHTML = this.deviceName;

    const vol_info = document.createElement("div");
    const volume_dB = this.status.actual_volume.value;
    const volume_percent = Math.trunc((this.status.volume / this.deviceMaxVolDecimal) * 100);
    vol_info.className = "vol-info-container bright medium";
    vol_info.innerHTML = `${volume_dB} ${this.status.actual_volume.unit}(${volume_percent}%)</div>`;

    const info = document.createElement("div");
    info.className = "status-info small normal";
    
    // 전원 상태, 입력 소스, 볼륨 표시
    const powerStr = this.status.power === "on" ? "ON" : "OFF";
    
    const input = this.status.input.toUpperCase();

    info.innerHTML = `<div>Status: ${powerStr} | Input: ${input}</div>`;

    wrapper.appendChild(name);
    wrapper.appendChild(vol_info);
    wrapper.appendChild(info);
    return wrapper;
  }
});