<template>
  <div class="lm-auth-layout">
    <section class="lm-auth-hero">
      <img
        class="lm-auth-hero__img"
        src="/static/imgs/assets/lingma_erp_middle_illustration_asset.png"
        alt="领码ERP登录页"
      />
    </section>

    <section class="lm-auth-form">
      <div class="lm-auth-form__inner">
        <RouterView />
      </div>
    </section>
  </div>
</template>

<style scoped>
.lm-auth-layout {
  display: grid;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  background: #ffffff;
  grid-template-columns: minmax(0, 1fr) 310px;
}

.lm-auth-hero {
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
  background: #edf4ff;
}

.lm-auth-hero__img {
  display: block;
  width: 100%;
  height: 100vh;
  object-fit: cover;
  object-position: center center;
  user-select: none;
}

.lm-auth-form {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 14px;
  background: #fff;
  border-left: 1px solid #eef1f6;
  box-shadow: -12px 0 30px rgba(56, 80, 120, 0.06);
}

.lm-auth-form__inner {
  width: 100%;
  max-width: 256px;
}

@media (max-width: 1100px) {
  .lm-auth-layout {
    grid-template-columns: 1fr;
  }

  .lm-auth-hero {
    display: none;
  }

  .lm-auth-form {
    padding: 28px;
    background: linear-gradient(180deg, #eef5ff, #fff);
    border-left: 0;
    box-shadow: none;
  }

  .lm-auth-form__inner {
    max-width: 360px;
    padding: 32px;
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 18px 45px rgba(57, 97, 167, 0.12);
  }
}
</style>
