# Workflow Editor Specification

## ADDED Requirements

### Requirement: Lifecycle Stage Assignment

The workflow editor SHALL allow operators to assign AARRR lifecycle stages to workflow elements.

#### Scenario: Assign lifecycle stage to task

- **WHEN** an operator selects a workflow task element
- **THEN** the properties panel displays a lifecycle stage dropdown
- **AND** available stages include: Acquisition, Activation, Retention, Revenue, Referral
- **AND** the selected stage is persisted in the workflow XML

#### Scenario: Visual indication of lifecycle stage

- **WHEN** a workflow element has an assigned lifecycle stage
- **THEN** the element displays a colored badge indicating the stage
- **AND** the color scheme follows: Acquisition (blue), Activation (green), Retention (yellow), Revenue (purple), Referral (orange)

#### Scenario: Filter elements by lifecycle stage

- **WHEN** an operator applies a lifecycle stage filter
- **THEN** only elements matching the selected stage are highlighted
- **AND** other elements are dimmed

### Requirement: User Segment Targeting

The workflow editor SHALL support configuring user segments for workflow targeting.

#### Scenario: Define target segment for workflow

- **WHEN** an operator opens workflow properties
- **THEN** a user segment builder is available
- **AND** segments can be defined by demographics (age, location, gender)
- **AND** segments can be defined by behavior (engagement level, purchase history, session count)
- **AND** multiple segment conditions can be combined with AND/OR logic

#### Scenario: Predefined segment templates

- **WHEN** an operator opens the segment builder
- **THEN** predefined segment templates are available
- **AND** templates include: "New Users", "Active Users", "At-Risk Users", "VIP Customers", "Dormant Users"
- **AND** operators can customize templates or create custom segments

#### Scenario: Segment assignment to workflow elements

- **WHEN** an operator assigns segments to a task element
- **THEN** the task will only execute for users matching the segment criteria
- **AND** the segment criteria is displayed in the properties panel

### Requirement: Trigger Condition Configuration

The workflow editor SHALL support defining trigger conditions for workflow execution.

#### Scenario: Time-based triggers

- **WHEN** an operator configures a start event
- **THEN** time-based trigger options are available
- **AND** supported triggers include: scheduled (cron), delay (duration), time window (start/end)
- **AND** the trigger schedule is validated for correctness

#### Scenario: Event-based triggers

- **WHEN** an operator configures a start event
- **THEN** event-based trigger options are available
- **AND** supported events include: user_signup, purchase_completed, page_viewed, session_started, milestone_reached
- **AND** event filters can be applied (e.g., purchase_completed WHERE amount > 100)

#### Scenario: Data threshold triggers

- **WHEN** an operator configures a gateway decision
- **THEN** data threshold conditions are available
- **AND** conditions can compare user attributes (e.g., engagement_score > 70)
- **AND** multiple conditions can be combined with logical operators

### Requirement: Workflow Metadata Management

The workflow editor SHALL support comprehensive metadata for operations context.

#### Scenario: Define workflow purpose and goals

- **WHEN** an operator creates or edits a workflow
- **THEN** a metadata panel is available
- **AND** metadata fields include: name, description, purpose, owner, created_date, modified_date
- **AND** purpose can be selected from: Onboarding, Engagement, Conversion, Retention, Win-back

#### Scenario: Set success metrics

- **WHEN** an operator defines workflow metadata
- **THEN** success metrics can be configured
- **AND** available metrics include: conversion_rate, engagement_rate, completion_rate, revenue_generated, user_activation_count
- **AND** target values can be set for each metric

#### Scenario: Add workflow tags

- **WHEN** an operator edits workflow metadata
- **THEN** tags can be added for categorization
- **AND** tags support autocomplete from existing tags
- **AND** workflows can be searched and filtered by tags

### Requirement: Enhanced Properties Panel

The workflow editor SHALL provide an enhanced properties panel for lifecycle operations.

#### Scenario: Contextual properties display

- **WHEN** an operator selects different element types
- **THEN** the properties panel displays contextually relevant fields
- **AND** service tasks show: action type, API endpoint, parameters, retry policy
- **AND** user tasks show: task type, notification settings, timeout
- **AND** gateways show: decision logic, split ratios, fallback behavior

#### Scenario: Property validation

- **WHEN** an operator enters property values
- **THEN** real-time validation is performed
- **AND** invalid values display error messages
- **AND** required fields are marked with indicators
- **AND** the workflow cannot be saved with validation errors

### Requirement: Workflow Versioning Support

The workflow editor SHALL support version tracking for workflow changes.

#### Scenario: Create workflow version

- **WHEN** an operator saves changes to an active workflow
- **THEN** a new version is created
- **AND** version number follows semantic versioning (major.minor.patch)
- **AND** version metadata includes: timestamp, author, change description

#### Scenario: View version history

- **WHEN** an operator opens version history
- **THEN** all previous versions are listed with metadata
- **AND** operators can preview previous versions
- **AND** operators can compare versions (diff view)

#### Scenario: Rollback to previous version

- **WHEN** an operator selects a previous version
- **THEN** a rollback option is available
- **AND** confirmation is required before rollback
- **AND** rollback creates a new version (not destructive)
