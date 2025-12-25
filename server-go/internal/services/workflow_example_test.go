package services

import (
	"context"
	"testing"

	"github.com/bpmn-explorer/server/internal/interceptor"
)

// TestInterceptorWithStructParams demonstrates how to use the new interceptor
// with struct parameters for improved type safety and ID generation
func TestInterceptorWithStructParams(t *testing.T) {
	// This is a conceptual example showing how the new architecture works

	ctx := context.Background()

	// Create interceptor config
	config := interceptor.NewInterceptConfig(map[string]string{
		"GetWorkflow:workflow-123": "enabled", // This workflow ID will use mock data
	})
	ctx = interceptor.WithInterceptConfig(ctx, config)

	// Set mock data
	// mockWorkflow := &models.Workflow{Id: "workflow-123", Name: "Mock Workflow"}
	// config.SetMockData("GetWorkflow:workflow-123", mockWorkflow)

	// OLD WAY (closure-based):
	// workflow, err := interceptor.InterceptLegacy(ctx, "GetWorkflow",
	//     func(ctx context.Context) (*models.Workflow, error) {
	//         return workflowSvc.GetWorkflowByID(ctx, "workflow-123")
	//     })

	// NEW WAY (struct-based):
	// workflow, err := interceptor.Intercept(ctx, "GetWorkflow",
	//     workflowSvc.GetWorkflowByIDWithParams,
	//     GetWorkflowByIDParams{WorkflowID: "workflow-123"})
	//
	// Key benefits:
	// 1. The interceptor ID "GetWorkflow:workflow-123" is auto-generated from the
	//    WorkflowID field tagged with `intercept:"id"`
	// 2. Type-safe parameter passing
	// 3. Method reference instead of closure
	// 4. Cleaner, more readable code
}

// TestInterceptorIDGeneration shows how interceptor IDs are generated
func TestInterceptorIDGeneration(t *testing.T) {
	// Example 1: Simple struct with one ID field
	params1 := GetWorkflowByIDParams{
		WorkflowID: "workflow-123",
	}
	// Generated ID: "GetWorkflow:workflow-123"

	// Example 2: Struct with multiple ID fields (hypothetical)
	// type UpdateWorkflowParams struct {
	//     WorkflowID string `json:"workflowId" intercept:"id"`
	//     Version    int    `json:"version" intercept:"id"`
	//     Name       string `json:"name"`  // Not tagged, won't be in ID
	// }
	// params2 := UpdateWorkflowParams{
	//     WorkflowID: "workflow-123",
	//     Version:    2,
	//     Name:       "My Workflow",
	// }
	// Generated ID: "UpdateWorkflow:workflow-123:2"
	// Note: Name is not included because it doesn't have intercept:"id" tag

	t.Logf("Example params: %+v", params1)
}

// BenchmarkInterceptorComparison compares old vs new approach
func BenchmarkInterceptorComparison(b *testing.B) {
	// This would show that the new struct-based approach has similar
	// or better performance than the closure approach, with added benefits
	// of type safety and automatic ID generation
}
