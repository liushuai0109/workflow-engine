import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';

// Ant Design Vue 样式
import 'ant-design-vue/dist/reset.css';

import './style.css';

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Antd from 'ant-design-vue'

const app = createApp(App)

// 安装 Ant Design Vue
app.use(Antd)

app.use(router)
app.mount('#app')