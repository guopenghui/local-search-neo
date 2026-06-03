import { createApp } from "vue";
import "./main.css";
import App from "./App.vue";
import { installDevMock } from "./devMock";

if (import.meta.env.DEV) {
  installDevMock();
}

createApp(App).mount("#app");
