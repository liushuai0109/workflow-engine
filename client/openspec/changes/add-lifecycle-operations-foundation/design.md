# Design: User Lifecycle Operations Foundation

## Context

The current XPMN Explorer is a client-side BPMN diagram editor. The business vision requires transforming it into a full-stack user lifecycle operations platform. This design establishes the foundational architecture for Phase 1: adding lifecycle context to workflows while maintaining the current editor's functionality.

### Current Architecture
- **Frontend**: Vue 3 SPA with bpmn-js, client-side only
- **State**: In-memory with localStorage persistence
- **Format**: BPMN/XPMN XML with custom XFlow extensions
- **Scope**: Technical workflow modeling

### Target Architecture (Phase 1)
- **Frontend**: Enhanced editor with lifecycle operations context
- **Data Model**: Structured lifecycle, segment, and trigger definitions
- **Format**: Extended BPMN/XPMN with lifecycle metadata namespace
- **Scope**: Business-oriented user journey workflows

### Constraints
- Must maintain backward compatibility with existing workflows
- Phase 1 remains client-side (backend implementation in future phases)
- Changes must not break existing BpmnAdapter conversion logic

## Goals / Non-Goals

### Goals
1. ✅ Add AARRR lifecycle stage support to workflow elements
2. ✅ Enable user segment targeting configuration
3. ✅ Support trigger condition definition
4. ✅ Establish data models for future backend integration
5. ✅ Maintain existing BPMN editor functionality
6. ✅ Provide migration path for existing workflows

### Non-Goals
1. ❌ Backend implementation (planned for Phase 2+)
2. ❌ Real-time data integration (planned for Phase 2+)
3. ❌ Data visualization dashboards (planned for Phase 2)
4. ❌ AI Agent automation (planned for Phase 3)
5. ❌ End-user personalization interface (planned for Phase 5)

## Decisions

### Decision 1: Extend XFlow Extension Format

**Choice**: Add lifecycle metadata to existing XFlow extension namespace rather than creating a new namespace.

**Rationale**:
- Leverages existing extension infrastructure
- Minimizes changes to BpmnAdapter
- Keeps lifecycle data within `bpmn:extensionElements` structure
- Maintains BPMN 2.0 standard compliance

**Structure**:
```xml
<bpmn:extensionElements>
  <xflow:lifecycle stage="Activation" />
  <xflow:segment type="demographic">
    <xflow:condition field="age" operator="between" value="18,35" />
  </xflow:segment>
  <xflow:trigger type="event" event="user_signup" />
  <xflow:metrics>
    <xflow:metric name="conversion_rate" target="0.25" />
  </xflow:metrics>
</bpmn:extensionElements>
```

**Alternatives Considered**:
- Create separate `lifecycle:` namespace → Rejected (too complex, requires new adapter logic)
- Store lifecycle data in separate JSON file → Rejected (breaks single-file workflow portability)
- Use BPMN documentation field → Rejected (not structured, hard to parse)

### Decision 2: TypeScript-First Data Models

**Choice**: Define all data structures as TypeScript interfaces first, generate JSON schemas from them.

**Rationale**:
- Type safety throughout the codebase
- IDE autocomplete and validation
- Single source of truth for data structures
- Can generate OpenAPI specs from types

**Implementation**:
```typescript
// src/types/lifecycle.ts
export enum LifecycleStage {
  Acquisition = 'Acquisition',
  Activation = 'Activation',
  Retention = 'Retention',
  Revenue = 'Revenue',
  Referral = 'Referral'
}

export interface UserSegment {
  id: string
  name: string
  type: 'demographic' | 'behavioral' | 'lifecycle' | 'value'
  conditions: SegmentCondition[]
  operator: 'AND' | 'OR'
}

export interface SegmentCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in'
  value: string | number | string[]
}
```

**Alternatives Considered**:
- JSON Schema first → Rejected (less developer-friendly, no compile-time checks)
- Protocol Buffers → Rejected (overkill for client-side, poor browser support)

### Decision 3: Configuration-Driven UI Components

**Choice**: Use JSON configuration files for lifecycle stages, segments, and triggers with Vue components that render from config.

**Rationale**:
- Easy to add new stages/segments without code changes
- Configurable by operators (future: admin UI to modify configs)
- Supports i18n through config
- Enables A/B testing of different lifecycle models

**Configuration Files**:
- `src/config/lifecycle-stages.json` - AARRR stage definitions with colors, icons, descriptions
- `src/config/user-segments.json` - Predefined segment templates
- `src/config/trigger-templates.json` - Common trigger patterns

**Component Pattern**:
```vue
<LifecycleStageSelector
  :stages="lifecycleConfig.stages"
  :value="currentStage"
  @update="handleStageChange"
/>
```

**Alternatives Considered**:
- Hardcode in components → Rejected (inflexible, requires code changes)
- Database-driven → Rejected (no backend yet, too complex for Phase 1)

### Decision 4: Backward Compatibility via Migration Layer

**Choice**: Implement automatic migration in BpmnAdapter for workflows without lifecycle metadata.

**Rationale**:
- Existing workflows must load without errors
- Graceful degradation for workflows created before this change
- No manual migration required from users
- Migration logic centralized in one place

**Migration Strategy**:
```typescript
// In BpmnAdapter.convertFromXPMNToBPMN()
function migrateToLifecycleFormat(element: Element): void {
  if (!hasLifecycleMetadata(element)) {
    // Assign default lifecycle stage based on element type
    const defaultStage = inferLifecycleStage(element.type)
    addLifecycleMetadata(element, { stage: defaultStage })
  }
}
```

**Default Mappings**:
- StartEvent → Acquisition
- UserTask → Activation (if early in flow) or Retention (if later)
- ServiceTask → Retention (API calls for engagement)
- Gateway → Retention (decision points)
- EndEvent → Referral (journey completion)

**Alternatives Considered**:
- Require manual migration → Rejected (poor user experience)
- No backward compatibility → Rejected (breaks existing workflows)
- Separate migration script → Rejected (adds friction, users may forget to run)

### Decision 5: Properties Panel Extension Architecture

**Choice**: Extend existing bpmn-js properties panel with custom property providers rather than replacing it.

**Rationale**:
- Preserves standard BPMN properties
- Adds lifecycle properties alongside standard ones
- Uses bpmn-js extension mechanism (well-documented)
- Maintains compatibility with bpmn-js updates

**Implementation**:
```typescript
// src/extensions/xflow/LifecyclePropertiesProvider.ts
export class LifecyclePropertiesProvider {
  getGroups(element: any) {
    return [
      createLifecycleGroup(element),
      createSegmentGroup(element),
      createTriggerGroup(element),
      createMetricsGroup(element)
    ]
  }
}
```

**Alternatives Considered**:
- Custom properties panel from scratch → Rejected (high effort, reinvents wheel)
- Modal dialogs for lifecycle properties → Rejected (inconsistent UX)

## Risks / Trade-offs

### Risk: Performance with Large Workflows
**Impact**: Medium
**Likelihood**: Low
**Mitigation**:
- Lifecycle metadata adds ~10-20% to XML file size
- Use lazy loading for properties panel components
- Implement virtual scrolling for segment/trigger lists
- Benchmark with workflows containing 100+ elements

### Risk: Breaking Changes to XFlow Format
**Impact**: High
**Likelihood**: Medium
**Mitigation**:
- Version the XFlow extension format (`<xflow:lifecycle version="1.0">`)
- Maintain adapter support for v1.0 format in perpetuity
- Provide migration warnings in console for old formats
- Document format changes in CHANGELOG

### Risk: Type Drift Between Frontend and Backend
**Impact**: High
**Likelihood**: High (future phases)
**Mitigation**:
- Share type definitions via npm package (future)
- Generate OpenAPI spec from TypeScript interfaces
- Add integration tests that validate both sides
- Use JSON Schema validation in BpmnAdapter

### Risk: User Confusion with New Concepts
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**:
- Add tooltips explaining lifecycle stages
- Provide default configurations that "just work"
- Create in-app tutorial for lifecycle concepts
- Document with examples in README

### Trade-off: Feature Completeness vs. Timeline
**Decision**: Implement foundational features in Phase 1, defer advanced features

**Rationale**:
- Phase 1 provides immediate value (lifecycle context)
- Enables iterative feedback from operators
- Reduces risk of over-engineering
- Future phases build on validated foundation

**What's Deferred**:
- Real-time segment membership calculation → Phase 2
- AI-powered segment suggestions → Phase 3
- Multi-channel trigger orchestration → Phase 4
- End-user personalization UI → Phase 5

## Migration Plan

### For Existing Workflows

1. **Automatic Migration on Load**:
   - When workflow XML is parsed, BpmnAdapter detects missing lifecycle metadata
   - Default lifecycle stages assigned based on element type heuristics
   - Migration log written to console for visibility

2. **User Notification**:
   - Show notification banner: "This workflow was created before lifecycle features. Default stages have been assigned. Review and customize in properties panel."
   - Provide "Review Lifecycle" button that highlights elements needing review

3. **Validation**:
   - All migrated workflows pass existing tests
   - Spot-check sample workflows manually
   - Provide rollback option (keep original XML in localStorage)

### For Development Team

1. **Update Development Workflows**:
   - Run `npm install` to get updated dependencies
   - Review new type definitions in `src/types/lifecycle.ts`
   - Read design doc and architecture diagrams

2. **Testing Updated Code**:
   - Run `npm test` to execute updated test suite
   - Test migration with sample workflows in `client/resources/`
   - Verify backward compatibility with old workflows

3. **Documentation**:
   - Update README with lifecycle features section
   - Add JSDoc comments to new types and services
   - Create architecture diagram showing new components

## Open Questions

1. **Q: Should lifecycle stages be customizable or fixed to AARRR?**
   **A**: Phase 1 fixes to AARRR. Phase 2+ allows custom stages via admin configuration.

2. **Q: How many predefined segment templates should we provide?**
   **A**: Start with 10 common templates. Expand based on user feedback.

3. **Q: Should trigger conditions support JavaScript expressions?**
   **A**: No for Phase 1 (security concern). Use declarative conditions only. Revisit in backend phase with sandboxed evaluation.

4. **Q: How do we handle workflows that span multiple lifecycle stages?**
   **A**: Elements can have different stages. Workflow-level metadata shows primary stage. Analytics aggregate across all stages.

5. **Q: What happens if user changes stage mid-workflow execution (future)?**
   **A**: Defer to Phase 2 when execution engine exists. Design execution state to be immutable per instance.

## Success Metrics

### Technical Metrics
- [ ] All existing workflows load without errors after migration
- [ ] Lifecycle metadata increases XML size by < 20%
- [ ] Properties panel renders lifecycle fields in < 100ms
- [ ] Zero TypeScript compilation errors
- [ ] Test coverage remains > 80%

### Product Metrics (Post-Launch)
- [ ] 50%+ of workflows use lifecycle stage tagging within 30 days
- [ ] 30%+ of workflows use segment targeting within 30 days
- [ ] < 5 support tickets related to lifecycle features per month
- [ ] 90%+ user satisfaction with lifecycle UI (survey)

## Future Architecture (Phases 2-5)

This foundation enables:

**Phase 2: Data & Analytics**
- Backend workflow execution engine
- User profile database
- Event streaming pipeline
- Analytics dashboards (ECharts integration)

**Phase 3: AI Automation**
- AI Agent for workflow optimization
- Intelligent segment recommendations
- Predictive lifecycle progression
- Automated content generation

**Phase 4: Multi-Channel Operations**
- Email/SMS/Push notification integration
- Campaign management
- A/B testing framework
- Attribution tracking

**Phase 5: End-User Personalization**
- Customer-facing personalization UI
- Real-time recommendation engine
- Dynamic content delivery
- User preference management
