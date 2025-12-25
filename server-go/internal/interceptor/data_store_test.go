package interceptor

import (
	"sync"
	"testing"
)

func TestInterceptDataStore_SetAndGet(t *testing.T) {
	store := NewInterceptDataStore()

	store.Set("key1", "value1")
	store.Set("key2", 123)

	value, exists := store.Get("key1")
	if !exists {
		t.Error("Expected key1 to exist")
	}
	if value != "value1" {
		t.Errorf("Expected 'value1', got '%v'", value)
	}

	value, exists = store.Get("key2")
	if !exists {
		t.Error("Expected key2 to exist")
	}
	if value != 123 {
		t.Errorf("Expected 123, got '%v'", value)
	}

	_, exists = store.Get("nonexistent")
	if exists {
		t.Error("Expected nonexistent key not to exist")
	}
}

func TestInterceptDataStore_SetBatch(t *testing.T) {
	store := NewInterceptDataStore()

	data := map[string]interface{}{
		"key1": "value1",
		"key2": 123,
		"key3": true,
	}

	store.SetBatch(data)

	for key, expectedValue := range data {
		value, exists := store.Get(key)
		if !exists {
			t.Errorf("Expected key '%s' to exist", key)
		}
		if value != expectedValue {
			t.Errorf("Expected '%v', got '%v' for key '%s'", expectedValue, value, key)
		}
	}
}

func TestInterceptDataStore_Clear(t *testing.T) {
	store := NewInterceptDataStore()

	store.Set("key1", "value1")
	store.Set("key2", 123)

	store.Clear()

	_, exists := store.Get("key1")
	if exists {
		t.Error("Expected key1 not to exist after clear")
	}

	_, exists = store.Get("key2")
	if exists {
		t.Error("Expected key2 not to exist after clear")
	}
}

func TestInterceptDataStore_LoadFromJSON(t *testing.T) {
	store := NewInterceptDataStore()

	jsonData := `{
		"key1": "value1",
		"key2": 123,
		"key3": true
	}`

	err := store.LoadFromJSON(jsonData)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	value, exists := store.Get("key1")
	if !exists {
		t.Error("Expected key1 to exist")
	}
	if value != "value1" {
		t.Errorf("Expected 'value1', got '%v'", value)
	}
}

func TestInterceptDataStore_LoadFromJSON_InvalidJSON(t *testing.T) {
	store := NewInterceptDataStore()

	jsonData := `{invalid json}`

	err := store.LoadFromJSON(jsonData)
	if err == nil {
		t.Error("Expected error for invalid JSON")
	}
}

func TestInterceptDataStore_ExportToJSON(t *testing.T) {
	store := NewInterceptDataStore()

	store.Set("key1", "value1")
	store.Set("key2", 123)

	jsonStr, err := store.ExportToJSON()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	// Load into new store to verify
	newStore := NewInterceptDataStore()
	err = newStore.LoadFromJSON(jsonStr)
	if err != nil {
		t.Errorf("Expected no error loading exported JSON, got %v", err)
	}

	value, exists := newStore.Get("key1")
	if !exists {
		t.Error("Expected key1 to exist in new store")
	}
	if value != "value1" {
		t.Errorf("Expected 'value1', got '%v'", value)
	}
}

func TestInterceptDataStore_GetAll(t *testing.T) {
	store := NewInterceptDataStore()

	store.Set("key1", "value1")
	store.Set("key2", 123)

	allData := store.GetAll()

	if len(allData) != 2 {
		t.Errorf("Expected 2 entries, got %d", len(allData))
	}

	if allData["key1"] != "value1" {
		t.Errorf("Expected 'value1', got '%v'", allData["key1"])
	}

	if allData["key2"] != 123 {
		t.Errorf("Expected 123, got '%v'", allData["key2"])
	}

	// Verify it's a copy (modifying returned map shouldn't affect store)
	allData["key3"] = "value3"
	_, exists := store.Get("key3")
	if exists {
		t.Error("Expected key3 not to exist in store (should be a copy)")
	}
}

func TestInterceptDataStore_ConcurrentAccess(t *testing.T) {
	store := NewInterceptDataStore()
	var wg sync.WaitGroup

	// Concurrent writes
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			store.Set(string(rune(index)), index)
		}(i)
	}

	// Concurrent reads
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			store.Get(string(rune(index)))
		}(i)
	}

	wg.Wait()

	// If we get here without deadlock or race condition, test passes
}
