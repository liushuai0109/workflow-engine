import type { Injectable } from '../shared/types'

export interface XFlowModule {
  name?: string
  version?: string
  description?: string
}

export interface XFlowMethod {
  name?: string
  parameters?: string
  returnType?: string
  description?: string
}

export interface ServiceTaskExtension extends Injectable {
  module?: XFlowModule
  method?: XFlowMethod
}
