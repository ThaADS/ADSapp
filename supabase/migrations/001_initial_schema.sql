-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  whatsapp_business_account_id TEXT,
  whatsapp_phone_number_id TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'past_due')),
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent')),
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  name TEXT,
  profile_picture_url TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_blocked BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, whatsapp_id)
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'system')),
  media_url TEXT,
  media_mime_type TEXT,
  is_read BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation rules table
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'business_hours', 'unassigned', 'first_message')),
  trigger_conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates table
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks log table
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics tables
CREATE TABLE conversation_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  new_conversations INTEGER DEFAULT 0,
  resolved_conversations INTEGER DEFAULT 0,
  avg_response_time INTERVAL,
  avg_resolution_time INTERVAL,
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date, agent_id)
);

-- Indexes for performance
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id);
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_sender_type ON messages(sender_type);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Organizations
CREATE POLICY "Users can view their own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- RLS Policies for Profiles
CREATE POLICY "Users can view profiles in their organization" ON profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Admins and owners can manage profiles" ON profiles
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for Contacts
CREATE POLICY "Users can access contacts in their organization" ON contacts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Conversations
CREATE POLICY "Users can access conversations in their organization" ON conversations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Messages
CREATE POLICY "Users can access messages in their organization conversations" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN profiles p ON p.organization_id = c.organization_id
      WHERE p.id = auth.uid()
    )
  );

-- RLS Policies for Automation Rules
CREATE POLICY "Users can access automation rules in their organization" ON automation_rules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Message Templates
CREATE POLICY "Users can access templates in their organization" ON message_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Webhook Logs
CREATE POLICY "Users can view webhook logs in their organization" ON webhook_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Conversation Metrics
CREATE POLICY "Users can view metrics in their organization" ON conversation_metrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Functions for business logic
CREATE OR REPLACE FUNCTION get_conversation_unread_count(conv_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM messages
    WHERE conversation_id = conv_id
      AND sender_type = 'contact'
      AND is_read = false
  );
END;
$$ LANGUAGE plpgsql;

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL  -- organization_id will be set later by the application
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();