package interceptor

import (
	"encoding/json"
	"sync"
)

// InterceptDataStore provides thread-safe storage for mock data
type InterceptDataStore struct {
	data map[string]interface{}
	mu   sync.RWMutex
}

// NewInterceptDataStore creates a new InterceptDataStore
func NewInterceptDataStore() *InterceptDataStore {
	return &InterceptDataStore{
		data: make(map[string]interface{}),
	}
}

// Set stores mock data for the given key
func (s *InterceptDataStore) Set(key string, value interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[key] = value
}

// Get retrieves mock data for the given key
func (s *InterceptDataStore) Get(key string) (interface{}, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, exists := s.data[key]
	return value, exists
}

// SetBatch stores multiple mock data entries
func (s *InterceptDataStore) SetBatch(data map[string]interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, v := range data {
		s.data[k] = v
	}
}

// Clear removes all mock data
func (s *InterceptDataStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data = make(map[string]interface{})
}

// LoadFromJSON loads mock data from a JSON string
func (s *InterceptDataStore) LoadFromJSON(jsonData string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(jsonData), &data); err != nil {
		return err
	}

	s.data = data
	return nil
}

// ExportToJSON exports mock data as a JSON string
func (s *InterceptDataStore) ExportToJSON() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return "", err
	}

	return string(data), nil
}

// GetAll returns a copy of all mock data (for debugging)
func (s *InterceptDataStore) GetAll() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Return a copy
	result := make(map[string]interface{})
	for k, v := range s.data {
		result[k] = v
	}
	return result
}
