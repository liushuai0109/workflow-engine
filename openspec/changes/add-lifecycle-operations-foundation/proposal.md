# Change: Add User Lifecycle Operations Foundation

## Why

The current XPMN Explorer is a basic BPMN diagram editor focused on technical workflow modeling. The business vision requires transforming it into a comprehensive **User Lifecycle Operations Management Platform** that enables:

1. **Business Context**: Workflows must represent user journeys with lifecycle stages (AARRR model)
2. **Data-Driven Operations**: Integration with user data, behavioral analytics, and real-time events
3. **AI-Powered Automation**: Intelligent workflow orchestration and personalized user experiences
4. **Operations Focus**: Tools for marketers/operators to manage customer lifecycle without coding

**Gap Analysis**: Current implementation provides ~10-15% of the envisioned platform. This change establishes the foundational architecture to support user lifecycle operations.

## What Changes

### Phase 1: Foundation (This Change)

- **User Lifecycle Context**: Add AARRR model support to workflow elements
  - Define lifecycle stages: Acquisition, Activation, Retention, Revenue, Referral
  - Extend BPMN elements with user journey metadata
  - Add lifecycle stage visualization in editor

- **Enhanced Workflow Properties**:
  - User segment targeting (demographics, behavior, engagement level)
  - Trigger conditions (events, time-based, data thresholds)
  - Success metrics and KPIs per workflow stage

- **Data Model Foundation**:
  - Define user profile schema
  - Event data structure
  - Workflow execution context

- **Backend Architecture Planning**:
  - Design API contracts for workflow execution engine
  - Define data persistence strategy
  - Plan real-time event integration points

### Future Phases (Not in this change)

- Phase 2: Data Visualization & Analytics Dashboard
- Phase 3: AI Agent Workflow Automation
- Phase 4: Multi-channel Operations Orchestration
- Phase 5: End-user Personalization Interface

## Impact

### Affected Specs
- **NEW**: `workflow-editor` - Enhanced BPMN editor with lifecycle context
- **NEW**: `user-lifecycle` - AARRR model and user journey management
- **NEW**: `data-integration` - Data models and integration contracts

### Affected Code
- `src/extensions/xflow/` - Add lifecycle properties to XFlow extensions
- `src/types/index.ts` - Add user lifecycle type definitions
- `src/services/` - New services for lifecycle management
- `src/components/BpmnEditor.vue` - Enhanced properties panel
- New configuration files for lifecycle stages and segments

### Breaking Changes
- **BREAKING**: XFlow extension format will include new required metadata fields
- **BREAKING**: Workflow XML schema will be extended with lifecycle namespaces

### Migration Path
- Existing workflows will be automatically migrated with default lifecycle stage "Retention"
- Backward compatibility maintained through adapter layer
- Migration script will be provided

## Success Criteria

- [ ] Workflow elements can be tagged with AARRR lifecycle stages
- [ ] Properties panel supports user segment configuration
- [ ] Workflow can define trigger conditions and success metrics
- [ ] Data models documented and validated
- [ ] Backend API contracts defined (OpenAPI spec)
- [ ] Existing workflows load without errors after migration
- [ ] All tests pass with new type definitions
