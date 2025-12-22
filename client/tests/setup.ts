import * as Vue from 'vue'
import * as VueCompilerDOM from '@vue/compiler-dom'
import * as VueServerRenderer from '@vue/server-renderer'

// 确保 Vue 在全局可用 (required by @vue/test-utils)
;(global as any).Vue = Vue
;(global as any).VueCompilerDOM = VueCompilerDOM
;(global as any).VueServerRenderer = VueServerRenderer
