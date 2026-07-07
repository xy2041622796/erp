<script lang="ts" setup>
import contactScanQrcode from '#/assets/imgs/contact-scan-qrcode.png';
</script>

<template>
  <aside class="online-consult-float" aria-label="在线咨询">
    <div class="online-consult-main" tabindex="0">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a7 7 0 0 0-7 7v3.2c0 .9.7 1.6 1.6 1.6h1.1V9.9H6.9A5.1 5.1 0 0 1 12 4.8a5.1 5.1 0 0 1 5.1 5.1h-.8v4.9h1.1c.3 0 .6-.1.8-.2-.5 1.9-1.7 3.1-3.6 3.5-.3-.6-.9-1-1.6-1h-1.8a1.8 1.8 0 1 0 0 3.6H13c.8 0 1.4-.5 1.7-1.1 3.3-.6 5.3-2.9 5.3-6.5V10a7 7 0 0 0-7-7h-1Zm-5 8.7h.7V13H7v-1.3Zm9.3 0h.7V13h-.7v-1.3ZM11.2 18.8H13v.1h-1.8v-.1Z" />
      </svg>
      <span>在线咨询</span>
    </div>

    <div class="online-consult-panel">
      <div class="online-consult-title">快速联系顾问</div>

      <div class="phone-card" aria-label="电话咨询">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.5c0 .7-.5 1.2-1.2 1.2C10.7 21.4 2.6 13.3 2.6 3.4c0-.7.5-1.2 1.2-1.2h3.5c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.8.6 4 .1.4 0 .8-.3 1.2l-2.2 2.2Z" />
        </svg>
        <div>
          <div class="phone-label">咨询电话:</div>
          <div class="phone-number">027-83616665</div>
        </div>
      </div>

      <div class="qr-card" aria-label="扫码咨询">
        <img :src="contactScanQrcode" alt="扫码咨询二维码" class="qr-image" />
        <div class="qr-text">扫码咨询</div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.online-consult-float {
  position: fixed;
  right: 24px;
  top: 50%;
  z-index: 120;
  display: flex;
  align-items: center;
  transform: translateY(-50%);
  filter: drop-shadow(0 16px 30px rgb(37 99 235 / 18%));
}

.online-consult-main {
  width: 46px;
  min-height: 108px;
  padding: 12px 0;
  border-radius: 11px;
  color: #fff;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  cursor: default;
  outline: none;
}

.online-consult-main svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.online-consult-main span {
  width: 16px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
}

.online-consult-panel {
  position: absolute;
  right: 56px;
  top: 50%;
  width: 174px;
  padding: 14px 12px 12px;
  border: 1px solid #dce8ff;
  border-radius: 10px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 10px 28px rgb(15 23 42 / 10%);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate(10px, -50%);
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
}

.online-consult-panel::after {
  position: absolute;
  right: -9px;
  top: 50%;
  width: 0;
  height: 0;
  content: '';
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-left: 9px solid rgb(255 255 255 / 96%);
  transform: translateY(-50%);
}

.online-consult-float:hover .online-consult-panel,
.online-consult-float:focus-within .online-consult-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translate(0, -50%);
}

.online-consult-title {
  margin-bottom: 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.phone-card {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 10px;
  border: 1px solid #a9c5ff;
  border-radius: 6px;
  color: #4f7ff7;
  background: #fff;
}

.phone-card svg {
  width: 22px;
  height: 22px;
  flex: none;
  fill: currentColor;
}

.phone-label {
  font-size: 13px;
  line-height: 1.2;
}

.phone-number {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.5px;
}

.qr-card {
  margin-top: 10px;
  padding: 10px 8px 8px;
  border: 1px solid #a9c5ff;
  border-radius: 6px;
  color: #4f7ff7;
  background: #fff;
}

.qr-image {
  display: block;
  width: 142px;
  height: 136px;
  margin: 0 auto;
  object-fit: contain;
}

.qr-text {
  margin-top: 6px;
  color: #4f7ff7;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

@media (max-width: 768px) {
  .online-consult-float {
    right: 10px;
    top: 68%;
    transform: translateY(-50%) scale(0.86);
    transform-origin: right center;
  }
}
</style>
