import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import { append as svgAppend, attr as svgAttr, create as svgCreate } from 'tiny-svg'
import type { BpmnElement, BpmnRenderer, Injectable } from '../shared/types'

const HIGH_PRIORITY = 1500

// 流量数据映射接口
export interface FlowData {
  [flowId: string]: number  // flowId -> 流量值
}

export default class FlowRenderer extends BaseRenderer {
  private bpmnRenderer: BpmnRenderer
  private flowData: FlowData = {}
  private maxFlow: number = 100
  private minStrokeWidth: number = 2
  private maxStrokeWidth: number = 20
  private enabled: boolean = false

  constructor(eventBus: any, bpmnRenderer: BpmnRenderer) {
    super(eventBus, HIGH_PRIORITY)
    this.bpmnRenderer = bpmnRenderer
  }

  canRender(element: BpmnElement): boolean {
    // 只在启用时渲染 SequenceFlow
    return this.enabled && is(element, 'bpmn:SequenceFlow')
  }

  drawConnection(parentNode: SVGElement, element: any): SVGElement {
    // 如果没有流量数据，使用默认渲染
    const flowValue = this.flowData[element.id] || 0

    // 计算连线粗细
    const strokeWidth = this.calculateStrokeWidth(flowValue)

    // 计算颜色（基于流量，从蓝色到红色渐变）
    const color = this.calculateColor(flowValue)

    // 创建路径
    const waypoints = element.waypoints
    const pathData = this.createPathFromWaypoints(waypoints)

    const path = svgCreate('path')
    svgAttr(path, {
      d: pathData,
      'stroke-width': strokeWidth,
      stroke: color,
      fill: 'none',
      'stroke-linejoin': 'round',
      'marker-end': this.createMarker(color, strokeWidth)
    })

    svgAppend(parentNode, path)

    // 添加流量标签
    if (flowValue > 0) {
      this.drawFlowLabel(parentNode, waypoints, flowValue)
    }

    return path
  }

  // 设置流量数据
  setFlowData(flowData: FlowData): void {
    this.flowData = flowData

    // 计算最大流量用于归一化
    const values = Object.values(flowData)
    this.maxFlow = values.length > 0 ? Math.max(...values) : 100
  }

  // 启用/禁用流量可视化
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  // 根据流量值计算连线粗细
  private calculateStrokeWidth(flowValue: number): number {
    if (this.maxFlow === 0) return this.minStrokeWidth

    const normalized = flowValue / this.maxFlow
    return this.minStrokeWidth + (this.maxStrokeWidth - this.minStrokeWidth) * normalized
  }

  // 根据流量值计算颜色（蓝色->绿色->黄色->橙色->红色）
  private calculateColor(flowValue: number): string {
    if (this.maxFlow === 0) return '#3b82f6' // 默认蓝色

    const normalized = flowValue / this.maxFlow

    // 使用渐变色
    if (normalized < 0.2) {
      return '#3b82f6' // 蓝色 (低流量)
    } else if (normalized < 0.4) {
      return '#10b981' // 绿色
    } else if (normalized < 0.6) {
      return '#fbbf24' // 黄色
    } else if (normalized < 0.8) {
      return '#f97316' // 橙色
    } else {
      return '#ef4444' // 红色 (高流量)
    }
  }

  // 从路径点创建SVG路径
  private createPathFromWaypoints(waypoints: any[]): string {
    if (!waypoints || waypoints.length < 2) return ''

    let pathData = `M ${waypoints[0].x} ${waypoints[0].y}`

    for (let i = 1; i < waypoints.length; i++) {
      pathData += ` L ${waypoints[i].x} ${waypoints[i].y}`
    }

    return pathData
  }

  // 创建箭头标记
  private createMarker(color: string, strokeWidth: number): string {
    // 使用 bpmn-js 的默认标记，但可以自定义颜色
    return `url(#sequenceflow-end-${this.colorToId(color)})`
  }

  // 将颜色转换为ID友好的字符串
  private colorToId(color: string): string {
    return color.replace('#', '')
  }

  // 绘制流量标签
  private drawFlowLabel(parentNode: SVGElement, waypoints: any[], flowValue: number): void {
    if (!waypoints || waypoints.length < 2) return

    // 在连线中点位置显示流量值
    const midIndex = Math.floor(waypoints.length / 2)
    const midPoint = waypoints[midIndex]

    // 创建背景矩形
    const text = svgCreate('text')
    svgAttr(text, {
      x: midPoint.x,
      y: midPoint.y - 5,
      'text-anchor': 'middle',
      'font-size': '11px',
      'font-weight': 'bold',
      fill: '#1f2937',
      class: 'flow-label'
    })

    const tspan = svgCreate('tspan')
    tspan.textContent = flowValue.toFixed(0)
    svgAppend(text, tspan)

    // 添加背景
    const bbox = text.getBBox ? text.getBBox() : { x: midPoint.x - 15, y: midPoint.y - 15, width: 30, height: 15 }
    const bg = svgCreate('rect')
    svgAttr(bg, {
      x: bbox.x - 3,
      y: bbox.y - 1,
      width: bbox.width + 6,
      height: bbox.height + 2,
      fill: 'white',
      'fill-opacity': '0.9',
      rx: 3,
      class: 'flow-label-bg'
    })

    svgAppend(parentNode, bg)
    svgAppend(parentNode, text)
  }
}

(FlowRenderer as Injectable).$inject = ['eventBus', 'bpmnRenderer']
