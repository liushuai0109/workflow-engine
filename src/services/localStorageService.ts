// 简化的 localStorage 服务

export interface SavedDiagram {
  xml: string
  timestamp: number
  name?: string
}

export class LocalStorageService {
  private static readonly STORAGE_KEY = 'bpmn-explorer-diagram'

  /**
   * 保存当前图表到 localStorage
   */
  static saveDiagram(xml: string, name?: string): void {
    try {
      const diagram: SavedDiagram = {
        xml,
        timestamp: Date.now(),
        name: name || 'Untitled Diagram'
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(diagram))
      console.log('Diagram saved to localStorage:', { name: diagram.name, timestamp: diagram.timestamp })
    } catch (error) {
      console.error('Failed to save diagram to localStorage:', error)
    }
  }

  /**
   * 从 localStorage 加载图表
   */
  static loadDiagram(): SavedDiagram | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (!saved) {
        console.log('No saved diagram found in localStorage')
        return null
      }

      const diagram: SavedDiagram = JSON.parse(saved)
      console.log('Diagram loaded from localStorage:', { 
        name: diagram.name, 
        timestamp: diagram.timestamp,
        xmlLength: diagram.xml.length 
      })

      return diagram
    } catch (error) {
      console.error('Failed to load diagram from localStorage:', error)
      return null
    }
  }

  /**
   * 清除保存的图表
   */
  static clearDiagram(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('Diagram cleared from localStorage')
    } catch (error) {
      console.error('Failed to clear diagram from localStorage:', error)
    }
  }

  /**
   * 检查是否有保存的图表
   */
  static hasSavedDiagram(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null
  }

  /**
   * 检查 localStorage 是否可用
   */
  static isAvailable(): boolean {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch (error) {
      return false
    }
  }
}
