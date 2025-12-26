-- 添加营销方案相关表

-- 表：marketing_plans
CREATE TABLE IF NOT EXISTS marketing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  -- Core fields
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Complex fields stored as JSONB
  timeline JSONB NOT NULL DEFAULT '{}',
  objectives JSONB NOT NULL DEFAULT '{}',
  channels JSONB NOT NULL DEFAULT '[]',
  target_audience JSONB NOT NULL DEFAULT '{}',
  strategies JSONB NOT NULL DEFAULT '[]',
  budget JSONB,
  raw_content TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_plan_status CHECK (status IN ('draft', 'review', 'approved', 'active', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_marketing_plans_conversation ON marketing_plans(conversation_id);
CREATE INDEX IF NOT EXISTS idx_marketing_plans_status ON marketing_plans(status);
CREATE INDEX IF NOT EXISTS idx_marketing_plans_updated_at ON marketing_plans(updated_at DESC);

-- 表：audiences (人群数据)
CREATE TABLE IF NOT EXISTS audiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filter_conditions JSONB NOT NULL DEFAULT '[]',
  size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audiences_name ON audiences(name);
CREATE INDEX IF NOT EXISTS idx_audiences_created_at ON audiences(created_at DESC);

-- 表：audience_recommendations (人群推荐详情)
CREATE TABLE IF NOT EXISTS audience_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  audience_name VARCHAR(255) NOT NULL,

  -- Core metrics
  size INTEGER NOT NULL,
  market_share DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
  conversion_rate DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000

  -- Editable tags
  value_tags JSONB NOT NULL DEFAULT '[]',
  profile_tags JSONB NOT NULL DEFAULT '[]',

  -- Detailed demographics
  demographics JSONB,
  behaviors JSONB,
  recommendation_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audience_recommendations_audience ON audience_recommendations(audience_id);

-- 表：flow_charts (营销流程图数据)
CREATE TABLE IF NOT EXISTS flow_charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES marketing_plans(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'user_journey',
  title VARCHAR(255) NOT NULL,

  -- Flow chart data
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  diagram_data TEXT,

  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_flow_chart_type CHECK (type IN ('user_journey'))
);

CREATE INDEX IF NOT EXISTS idx_flow_charts_plan ON flow_charts(plan_id);
CREATE INDEX IF NOT EXISTS idx_flow_charts_generated_at ON flow_charts(generated_at DESC);
