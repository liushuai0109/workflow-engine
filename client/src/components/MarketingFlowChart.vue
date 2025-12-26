<template>
  <div class="marketing-flowchart">
    <div class="flowchart-header">
      <h4 class="flowchart-title">📊 营销流程图（用户旅程）</h4>
      <a-badge v-if="confirmed" status="success" text="已确认" class="confirmed-badge" />
    </div>

    <div class="flowchart-content">
      <!-- Chart Preview (SVG or Image) -->
      <div class="chart-preview" ref="chartContainer">
        <div v-if="loading" class="chart-loading">
          <a-spin />
          <span>生成流程图中...</span>
        </div>
        <div v-else class="mermaid-diagram">
          <!-- Using Mermaid syntax for flowchart -->
          <pre class="mermaid-code">{{ mermaidCode }}</pre>

          <!-- Visual representation with CSS -->
          <div class="flowchart-visual">
            <div class="flow-stage">
              <div class="stage-box awareness">
                <div class="stage-icon">👀</div>
                <div class="stage-name">认知阶段</div>
                <div class="stage-desc">触达目标用户</div>
                <div class="stage-channels">
                  <a-tag v-for="channel in flowData.awarenessChannels" :key="channel" size="small">{{ channel }}</a-tag>
                </div>
              </div>
              <div class="flow-arrow">↓</div>
            </div>

            <div class="flow-stage">
              <div class="stage-box interest">
                <div class="stage-icon">💡</div>
                <div class="stage-name">兴趣阶段</div>
                <div class="stage-desc">激发用户兴趣</div>
                <div class="stage-actions">
                  <div v-for="action in flowData.interestActions" :key="action" class="action-item">
                    • {{ action }}
                  </div>
                </div>
              </div>
              <div class="flow-arrow">↓</div>
            </div>

            <div class="flow-stage">
              <div class="stage-box conversion">
                <div class="stage-icon">🎯</div>
                <div class="stage-name">转化阶段</div>
                <div class="stage-desc">促成用户转化</div>
                <div class="stage-actions">
                  <div v-for="action in flowData.conversionActions" :key="action" class="action-item">
                    • {{ action }}
                  </div>
                </div>
              </div>
              <div class="flow-arrow">↓</div>
            </div>

            <div class="flow-stage">
              <div class="stage-box retention">
                <div class="stage-icon">🔄</div>
                <div class="stage-name">留存阶段</div>
                <div class="stage-desc">维护用户关系</div>
                <div class="stage-actions">
                  <div v-for="action in flowData.retentionActions" :key="action" class="action-item">
                    • {{ action }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flowchart-actions">
        <a-button v-if="!confirmed && !disabled" type="primary" @click="handleConfirm" :loading="confirming">
          确认流程图
        </a-button>
        <a-button v-if="!disabled" type="default" @click="handleViewFullScreen">
          <template #icon><ExpandOutlined /></template>
          查看大图
        </a-button>
      </div>

      <!-- Metrics Summary -->
      <div v-if="flowData.metrics" class="metrics-summary">
        <div class="metric-item">
          <span class="metric-label">预计触达</span>
          <span class="metric-value">{{ flowData.metrics.expectedReach?.toLocaleString() }} 人</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">预计转化率</span>
          <span class="metric-value">{{ flowData.metrics.expectedConversion }}%</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">预计周期</span>
          <span class="metric-value">{{ flowData.metrics.duration }}</span>
        </div>
      </div>
    </div>

    <!-- Full Screen Modal -->
    <a-modal
      v-model:open="fullScreenVisible"
      title="营销流程图 - 用户旅程"
      width="90%"
      :footer="null"
      centered
    >
      <div class="fullscreen-chart">
        <div class="flowchart-visual large">
          <div class="flow-stage">
            <div class="stage-box awareness">
              <div class="stage-icon">👀</div>
              <div class="stage-name">认知阶段</div>
              <div class="stage-desc">触达目标用户</div>
              <div class="stage-channels">
                <a-tag v-for="channel in flowData.awarenessChannels" :key="channel">{{ channel }}</a-tag>
              </div>
            </div>
            <div class="flow-arrow">↓</div>
          </div>

          <div class="flow-stage">
            <div class="stage-box interest">
              <div class="stage-icon">💡</div>
              <div class="stage-name">兴趣阶段</div>
              <div class="stage-desc">激发用户兴趣</div>
              <div class="stage-actions">
                <div v-for="action in flowData.interestActions" :key="action" class="action-item">
                  • {{ action }}
                </div>
              </div>
            </div>
            <div class="flow-arrow">↓</div>
          </div>

          <div class="flow-stage">
            <div class="stage-box conversion">
              <div class="stage-icon">🎯</div>
              <div class="stage-name">转化阶段</div>
              <div class="stage-desc">促成用户转化</div>
              <div class="stage-actions">
                <div v-for="action in flowData.conversionActions" :key="action" class="action-item">
                  • {{ action }}
                </div>
              </div>
            </div>
            <div class="flow-arrow">↓</div>
          </div>

          <div class="flow-stage">
            <div class="stage-box retention">
              <div class="stage-icon">🔄</div>
              <div class="stage-name">留存阶段</div>
              <div class="stage-desc">维护用户关系</div>
              <div class="stage-actions">
                <div v-for="action in flowData.retentionActions" :key="action" class="action-item">
                  • {{ action }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExpandOutlined } from '@ant-design/icons-vue'

interface FlowChartData {
  title: string
  awarenessChannels: string[]
  interestActions: string[]
  conversionActions: string[]
  retentionActions: string[]
  metrics?: {
    expectedReach: number
    expectedConversion: number
    duration: string
  }
}

interface Props {
  messageId: string
  flowData: FlowChartData
  disabled?: boolean
  loading?: boolean
}

interface Emits {
  (e: 'confirm'): void
  (e: 'viewFullScreen'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false
})

const emit = defineEmits<Emits>()

const confirmed = ref(false)
const confirming = ref(false)
const fullScreenVisible = ref(false)

// Mermaid code for the flowchart (for future integration)
const mermaidCode = `graph TD
    A[认知阶段<br/>触达目标用户] --> B[兴趣阶段<br/>激发用户兴趣]
    B --> C[转化阶段<br/>促成用户转化]
    C --> D[留存阶段<br/>维护用户关系]

    style A fill:#e6f7ff,stroke:#1890ff
    style B fill:#f6ffed,stroke:#52c41a
    style C fill:#fff7e6,stroke:#fa8c16
    style D fill:#f9f0ff,stroke:#722ed1`

const handleConfirm = async () => {
  confirming.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    confirmed.value = true
    message.success('流程图已确认')
    emit('confirm')
  } finally {
    confirming.value = false
  }
}

const handleViewFullScreen = () => {
  fullScreenVisible.value = true
  emit('viewFullScreen')
}
</script>

<style scoped>
.marketing-flowchart {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}

.flowchart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.flowchart-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  font-weight: 500;
}

.flowchart-content {
  background-color: #fff;
  border-radius: 6px;
  padding: 16px;
}

/* Chart Preview */
.chart-preview {
  min-height: 300px;
  margin-bottom: 16px;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 300px;
  color: #8c8c8c;
}

.mermaid-code {
  display: none; /* Hidden, for future Mermaid.js rendering */
}

/* Visual Flowchart */
.flowchart-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.flowchart-visual.large .stage-box {
  padding: 24px;
  min-width: 300px;
}

.flowchart-visual.large .stage-icon {
  font-size: 48px;
}

.flowchart-visual.large .stage-name {
  font-size: 18px;
}

.flow-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.stage-box {
  padding: 16px;
  border-radius: 8px;
  border: 2px solid;
  min-width: 200px;
  text-align: center;
  transition: all 0.3s ease;
}

.stage-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stage-box.awareness {
  background-color: #e6f7ff;
  border-color: #1890ff;
}

.stage-box.interest {
  background-color: #f6ffed;
  border-color: #52c41a;
}

.stage-box.conversion {
  background-color: #fff7e6;
  border-color: #fa8c16;
}

.stage-box.retention {
  background-color: #f9f0ff;
  border-color: #722ed1;
}

.stage-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stage-name {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.stage-desc {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 12px;
}

.stage-channels {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}

.stage-actions {
  text-align: left;
  font-size: 13px;
  color: #595959;
  margin-top: 8px;
}

.action-item {
  padding: 2px 0;
}

.flow-arrow {
  font-size: 24px;
  color: #8c8c8c;
  margin: 4px 0;
}

/* Actions */
.flowchart-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

/* Metrics */
.metrics-summary {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  margin-top: 16px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: #8c8c8c;
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

/* Full Screen Modal */
.fullscreen-chart {
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
}
</style>
