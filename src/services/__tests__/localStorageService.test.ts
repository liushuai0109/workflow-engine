import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { LocalStorageService } from '../localStorageService'

describe('LocalStorageService', () => {
  const originalLocalStorage = global.localStorage

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {}
    const mockSetItem = jest.fn((key: string, value: string) => {
      store[key] = value
    })
    const mockGetItem = jest.fn((key: string) => store[key] || null)
    const mockRemoveItem = jest.fn((key: string) => {
      delete store[key]
    })
    
    global.localStorage = {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key])
      }),
      get length() {
        return Object.keys(store).length
      },
      key: jest.fn((index: number) => Object.keys(store)[index] || null),
    } as Storage
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
  })

  describe('isAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(LocalStorageService.isAvailable()).toBe(true)
    })
  })

  describe('saveDiagram', () => {
    it('should save diagram to localStorage', () => {
      const xml = '<definitions>test</definitions>'
      const name = 'test-diagram'

      LocalStorageService.saveDiagram(xml, name)

      const savedData = JSON.parse(localStorage.getItem('bpmn-explorer-diagram') || '{}')
      expect(savedData.xml).toBe(xml)
      expect(savedData.name).toBe(name)
      expect(savedData.timestamp).toBeDefined()
    })
  })

  describe('loadDiagram', () => {
    it('should load diagram from localStorage', () => {
      const xml = '<definitions>test</definitions>'
      const name = 'test-diagram'
      const timestamp = Date.now()
      localStorage.setItem('bpmn-explorer-diagram', JSON.stringify({ xml, name, timestamp }))

      const result = LocalStorageService.loadDiagram()

      expect(result).toBeTruthy()
      expect(result?.xml).toBe(xml)
      expect(result?.name).toBe(name)
    })

    it('should return null when no diagram is saved', () => {
      // 确保清除所有数据
      localStorage.clear()
      const result = LocalStorageService.loadDiagram()
      expect(result).toBeNull()
    })
  })

  describe('hasSavedDiagram', () => {
    it('should return true when diagram exists', () => {
      localStorage.setItem('bpmn-explorer-diagram', JSON.stringify({ xml: 'test', name: 'test' }))
      expect(LocalStorageService.hasSavedDiagram()).toBe(true)
    })

    it('should return false when no diagram exists', () => {
      localStorage.clear()
      expect(LocalStorageService.hasSavedDiagram()).toBe(false)
    })
  })
})

