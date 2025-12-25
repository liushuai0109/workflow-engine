package interceptor

import (
	"sync"
	"testing"
	"time"
)

func TestMemorySessionStore_SetAndGet(t *testing.T) {
	store := NewMemorySessionStore()

	session := &InterceptSession{
		ID:         "test-session",
		InstanceID: "test-instance",
		Mode:       InterceptModeEnabled,
		DataStore:  NewInterceptDataStore(),
		CreatedAt:  time.Now(),
	}

	store.Set("test-session", session)

	retrieved, err := store.Get("test-session")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if retrieved == nil {
		t.Fatal("Expected to retrieve session")
	}
	if retrieved.ID != session.ID {
		t.Errorf("Expected session ID '%s', got '%s'", session.ID, retrieved.ID)
	}
}

func TestMemorySessionStore_GetNonexistent(t *testing.T) {
	store := NewMemorySessionStore()

	_, err := store.Get("nonexistent")
	if err == nil {
		t.Error("Expected error for nonexistent session")
	}
}

func TestMemorySessionStore_Delete(t *testing.T) {
	store := NewMemorySessionStore()

	session := &InterceptSession{
		ID:         "test-session",
		InstanceID: "test-instance",
	}

	store.Set("test-session", session)

	// Verify it exists
	if !store.Exists("test-session") {
		t.Error("Expected session to exist before delete")
	}

	store.Delete("test-session")

	// Verify it's deleted
	if store.Exists("test-session") {
		t.Error("Expected session not to exist after delete")
	}

	_, err := store.Get("test-session")
	if err == nil {
		t.Error("Expected error when getting deleted session")
	}
}

func TestMemorySessionStore_Exists(t *testing.T) {
	store := NewMemorySessionStore()

	if store.Exists("test-session") {
		t.Error("Expected session not to exist initially")
	}

	session := &InterceptSession{
		ID:         "test-session",
		InstanceID: "test-instance",
	}

	store.Set("test-session", session)

	if !store.Exists("test-session") {
		t.Error("Expected session to exist after set")
	}
}

func TestMemorySessionStore_ConcurrentAccess(t *testing.T) {
	store := NewMemorySessionStore()
	var wg sync.WaitGroup

	// Concurrent writes
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			session := &InterceptSession{
				ID:         string(rune(index)),
				InstanceID: string(rune(index)),
			}
			store.Set(session.ID, session)
		}(i)
	}

	// Concurrent reads
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			store.Get(string(rune(index)))
			store.Exists(string(rune(index)))
		}(i)
	}

	// Concurrent deletes
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			store.Delete(string(rune(index)))
		}(i)
	}

	wg.Wait()

	// If we get here without deadlock or race condition, test passes
}
