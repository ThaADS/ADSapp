-- =====================================================
-- ADSapp Knowledge Base - Video Tutorials Seed Data
-- =====================================================
-- This file seeds the database with 20 video tutorial records
-- Includes metadata, URLs, chapters, and learning objectives
--
-- Run after: seed_features_documentation.sql, seed_advanced_content_part2.sql
-- Last Updated: 2024-10-14
-- =====================================================

-- Create video_tutorials table if not exists
CREATE TABLE IF NOT EXISTS video_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER NOT NULL,
  video_url TEXT, -- YouTube URL or video hosting URL
  thumbnail_url TEXT,
  transcript_url TEXT,
  category TEXT NOT NULL,
  series TEXT NOT NULL, -- Getting Started, Core Features, Advanced, Use Cases
  difficulty_level TEXT NOT NULL, -- Beginner, Intermediate, Advanced
  learning_objectives JSONB,
  chapter_markers JSONB,
  related_articles JSONB, -- Links to knowledge base articles
  tags TEXT[],
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  publish_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_videos_category ON video_tutorials(category);
CREATE INDEX IF NOT EXISTS idx_videos_series ON video_tutorials(series);
CREATE INDEX IF NOT EXISTS idx_videos_published ON video_tutorials(is_published, publish_date);
CREATE INDEX IF NOT EXISTS idx_videos_difficulty ON video_tutorials(difficulty_level);

-- =====================================================
-- GETTING STARTED SERIES (Videos 1-5)
-- =====================================================

INSERT INTO video_tutorials (video_number, title, description, duration_seconds, category, series, difficulty_level, learning_objectives, chapter_markers, related_articles, tags) VALUES
(1,
 'Welcome to ADSapp - Platform Overview',
 'Get started with ADSapp, the professional WhatsApp Business inbox for teams. This complete platform overview shows you how ADSapp transforms customer communication with unified inbox, team collaboration, smart automation, professional templates, and powerful analytics.',
 240, -- 4 minutes
 'Getting Started',
 'Getting Started Series',
 'Beginner',
 '["Understand what ADSapp is and how it helps businesses", "Learn about the core capabilities and benefits", "Get excited about starting the onboarding journey", "Identify how ADSapp fits your business needs"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Welcome and overview"},
   {"time": "0:30", "title": "The Challenge We Solve", "description": "Common WhatsApp business problems"},
   {"time": "1:15", "title": "Five Core Capabilities", "description": "Unified inbox, collaboration, automation, templates, analytics"},
   {"time": "2:30", "title": "Who ADSapp Is For", "description": "Industries and business types"},
   {"time": "3:00", "title": "Getting Started", "description": "Simple setup process"},
   {"time": "3:30", "title": "Next Steps", "description": "Continue to next video"}
 ]',
 '["introduction-to-adsapp", "platform-overview", "core-features-summary"]',
 ARRAY['introduction', 'overview', 'platform', 'getting started', 'onboarding', 'whatsapp business']
),

(2,
 'Quick Start - Your First WhatsApp Message in 5 Minutes',
 'Learn how to send your first WhatsApp message through ADSapp in just 5 minutes. This hands-on tutorial walks you through inbox navigation, message composition, quick replies, and conversation management.',
 360, -- 6 minutes
 'Getting Started',
 'Getting Started Series',
 'Beginner',
 '["Successfully send first WhatsApp message through ADSapp", "Understand basic inbox navigation", "Learn fundamental message operations", "Use quick replies effectively", "Manage conversation status"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Quick start overview"},
   {"time": "0:20", "title": "Accessing Your Inbox", "description": "Login and inbox location"},
   {"time": "0:50", "title": "Understanding Inbox Layout", "description": "Conversation list, message area, details panel"},
   {"time": "1:40", "title": "Starting First Conversation", "description": "New conversation creation"},
   {"time": "2:30", "title": "Composing Messages", "description": "Message formatting and sending"},
   {"time": "3:30", "title": "Receiving and Responding", "description": "Real-time message handling"},
   {"time": "4:20", "title": "Using Quick Replies", "description": "Time-saving templates"},
   {"time": "5:00", "title": "Closing Conversations", "description": "Status management"},
   {"time": "5:30", "title": "Recap", "description": "Summary and next steps"}
 ]',
 '["first-message-guide", "inbox-basics", "message-composition"]',
 ARRAY['quick start', 'first message', 'tutorial', 'beginner', 'inbox', 'messaging']
),

(3,
 'Dashboard Navigation and Key Features Tour',
 'Master the complete ADSapp dashboard with this comprehensive navigation tour. Learn where to find every feature, understand the workspace layout, and discover productivity shortcuts.',
 480, -- 8 minutes
 'Getting Started',
 'Getting Started Series',
 'Beginner',
 '["Master complete dashboard navigation", "Understand all main feature areas", "Know where to find every major tool", "Use keyboard shortcuts efficiently", "Customize workspace preferences"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Dashboard tour overview"},
   {"time": "0:25", "title": "Navigation Menu", "description": "Main navigation walkthrough"},
   {"time": "1:15", "title": "Inbox Deep Dive", "description": "Inbox features and organization"},
   {"time": "2:30", "title": "Contacts Management", "description": "Customer database overview"},
   {"time": "3:30", "title": "Templates Library", "description": "Quick replies and message templates"},
   {"time": "4:20", "title": "Automation Workflows", "description": "Automation builder introduction"},
   {"time": "5:15", "title": "Analytics Dashboard", "description": "Performance metrics and reports"},
   {"time": "6:00", "title": "Settings Configuration", "description": "Account and organization settings"},
   {"time": "6:50", "title": "Quick Access Features", "description": "Search, notifications, shortcuts"},
   {"time": "7:30", "title": "Conclusion", "description": "Summary and next video"}
 ]',
 '["dashboard-overview", "navigation-guide", "feature-locations", "keyboard-shortcuts"]',
 ARRAY['dashboard', 'navigation', 'features', 'tour', 'interface', 'ui']
),

(4,
 'Connecting WhatsApp Business API - Complete Setup',
 'Step-by-step guide to connecting your WhatsApp Business API account to ADSapp. Complete setup from Meta Business account creation through final verification.',
 600, -- 10 minutes
 'Setup & Configuration',
 'Getting Started Series',
 'Intermediate',
 '["Successfully connect WhatsApp Business API", "Understand Meta Business verification process", "Configure phone number and business profile", "Troubleshoot common connection issues"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Setup overview"},
   {"time": "0:30", "title": "Prerequisites Check", "description": "What you need before starting"},
   {"time": "1:30", "title": "Meta Business Account", "description": "Creating Meta Business Manager account"},
   {"time": "3:00", "title": "WhatsApp API Setup", "description": "Setting up WhatsApp Business API"},
   {"time": "4:30", "title": "Business Profile", "description": "Configuring your business profile"},
   {"time": "5:45", "title": "ADSapp Connection", "description": "Connecting API to ADSapp"},
   {"time": "7:15", "title": "Verification", "description": "Testing the connection"},
   {"time": "8:00", "title": "Important Settings", "description": "Webhooks and rate limits"},
   {"time": "9:00", "title": "Troubleshooting", "description": "Common issues and solutions"},
   {"time": "9:40", "title": "Conclusion", "description": "Setup complete"}
 ]',
 '["whatsapp-api-setup", "meta-business-verification", "phone-number-connection"]',
 ARRAY['whatsapp api', 'setup', 'configuration', 'meta business', 'connection', 'integration']
),

(5,
 'Inviting Team Members and Setting Permissions',
 'Learn how to invite team members to ADSapp, configure role-based permissions, and manage your customer service team effectively.',
 360, -- 6 minutes
 'Team Management',
 'Getting Started Series',
 'Intermediate',
 '["Successfully invite team members to ADSapp", "Understand role-based permissions system", "Configure appropriate access levels", "Manage existing team members", "Apply security best practices"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Team management overview"},
   {"time": "0:20", "title": "Understanding Roles", "description": "Owner, Admin, Agent, Viewer roles"},
   {"time": "1:10", "title": "First Team Member", "description": "Inviting your first colleague"},
   {"time": "2:30", "title": "Pending Invitations", "description": "Managing invitation status"},
   {"time": "3:00", "title": "Team Onboarding", "description": "What happens when they join"},
   {"time": "3:45", "title": "Agent Permissions", "description": "Configuring detailed permissions"},
   {"time": "4:45", "title": "Bulk Invitations", "description": "Inviting multiple team members"},
   {"time": "5:20", "title": "Member Management", "description": "Updating and removing members"},
   {"time": "5:50", "title": "Conclusion", "description": "Team setup complete"}
 ]',
 '["team-member-management", "role-based-permissions", "user-access-control"]',
 ARRAY['team', 'permissions', 'roles', 'access control', 'user management', 'collaboration']
);

-- =====================================================
-- CORE FEATURES SERIES (Videos 6-13)
-- =====================================================

INSERT INTO video_tutorials (video_number, title, description, duration_seconds, category, series, difficulty_level, learning_objectives, chapter_markers, related_articles, tags) VALUES
(6,
 'Inbox Management - Handling Conversations Efficiently',
 'Master inbox workflow for efficient conversation handling. Learn conversation assignment, status management, tags, filters, and team collaboration features.',
 420, -- 7 minutes
 'Core Features',
 'Core Features Series',
 'Intermediate',
 '["Master inbox workflow for efficient handling", "Learn conversation assignment and status", "Use tags, filters, and search effectively", "Collaborate with team members seamlessly"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Inbox management overview"},
   {"time": "0:25", "title": "Organization System", "description": "Status, assignment, tags"},
   {"time": "1:30", "title": "Processing Conversations", "description": "5-step workflow"},
   {"time": "3:00", "title": "High-Volume Strategies", "description": "Efficiency tips for busy days"},
   {"time": "4:00", "title": "Team Collaboration", "description": "Notes, mentions, transfers"},
   {"time": "5:00", "title": "Filters and Search", "description": "Finding conversations fast"},
   {"time": "6:00", "title": "Best Practices", "description": "End-of-day checklist"},
   {"time": "6:45", "title": "Conclusion", "description": "Inbox mastery complete"}
 ]',
 '["inbox-management", "conversation-handling", "status-management", "team-collaboration"]',
 ARRAY['inbox', 'conversations', 'workflow', 'efficiency', 'collaboration', 'organization']
),

(7,
 'Message Templates - Create and Use Professional Templates',
 'Master template creation, understand WhatsApp approval process, and use templates effectively for consistent, professional communication.',
 390, -- 6.5 minutes
 'Core Features',
 'Core Features Series',
 'Intermediate',
 '["Master template creation", "Understand approval process", "Use templates effectively", "Organize template library"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Template overview"},
   {"time": "0:30", "title": "Quick Replies", "description": "Creating instant responses"},
   {"time": "2:00", "title": "WhatsApp Templates", "description": "Approved message templates"},
   {"time": "4:00", "title": "Best Practices", "description": "Template optimization tips"},
   {"time": "5:00", "title": "Conclusion", "description": "Templates ready to use"}
 ]',
 '["message-templates", "quick-replies", "whatsapp-templates", "template-approval"]',
 ARRAY['templates', 'messages', 'quick replies', 'whatsapp templates', 'consistency']
),

(8,
 'Contact Management - Organize Your Customer Database',
 'Learn effective contact management, use custom fields, organize with tags, and maintain a professional customer database.',
 450, -- 7.5 minutes
 'Core Features',
 'Core Features Series',
 'Intermediate',
 '["Manage contacts effectively", "Use custom fields strategically", "Organize with tags", "Import/export data", "Search contacts quickly"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Contact management overview"},
   {"time": "0:30", "title": "Contact Profiles", "description": "Viewing and editing contacts"},
   {"time": "2:00", "title": "Tagging System", "description": "Creating and applying tags"},
   {"time": "3:00", "title": "Import/Export", "description": "Bulk data operations"},
   {"time": "4:00", "title": "Contact Search", "description": "Advanced search features"},
   {"time": "5:00", "title": "Conclusion", "description": "Database organized"}
 ]',
 '["contact-management", "custom-fields", "contact-tags", "import-export"]',
 ARRAY['contacts', 'crm', 'database', 'organization', 'tags', 'custom fields']
),

(9,
 'Automation Workflows - Save Time with Smart Rules',
 'Build automation rules, understand triggers and actions, create multi-step workflows, and test automation thoroughly.',
 540, -- 9 minutes
 'Core Features',
 'Core Features Series',
 'Advanced',
 '["Build automation rules effectively", "Understand triggers and actions", "Test workflows thoroughly", "Monitor automation performance"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Automation overview"},
   {"time": "0:30", "title": "Automation Concepts", "description": "WHEN-IF-THEN structure"},
   {"time": "1:30", "title": "Creating First Rule", "description": "Welcome message automation"},
   {"time": "3:30", "title": "Advanced Workflows", "description": "Multi-step automation"},
   {"time": "6:00", "title": "Testing and Monitoring", "description": "Ensuring automation works"},
   {"time": "7:00", "title": "Conclusion", "description": "Automation active"}
 ]',
 '["automation-workflows", "automation-rules", "triggers-actions", "workflow-testing"]',
 ARRAY['automation', 'workflows', 'rules', 'triggers', 'actions', 'efficiency']
),

(10,
 'Team Collaboration - Internal Communication and Handoffs',
 'Use internal notes effectively, mention teammates, transfer conversations smoothly, and maintain seamless team collaboration.',
 330, -- 5.5 minutes
 'Core Features',
 'Core Features Series',
 'Intermediate',
 '["Use internal notes effectively", "Mention teammates appropriately", "Transfer conversations smoothly", "Maintain collaboration context"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Collaboration overview"},
   {"time": "0:30", "title": "Internal Notes", "description": "Adding context for team"},
   {"time": "2:00", "title": "@Mentions", "description": "Notifying specific teammates"},
   {"time": "3:00", "title": "Conversation Transfer", "description": "Smooth handoffs"},
   {"time": "4:30", "title": "Conclusion", "description": "Team collaboration mastered"}
 ]',
 '["team-collaboration", "internal-notes", "mentions", "conversation-transfer"]',
 ARRAY['collaboration', 'teamwork', 'notes', 'mentions', 'handoffs', 'communication']
),

(11,
 'Analytics Dashboard - Track Your Performance Metrics',
 'Understand key metrics, interpret charts, analyze team performance, and export custom reports for data-driven decisions.',
 480, -- 8 minutes
 'Core Features',
 'Core Features Series',
 'Intermediate',
 '["Understand key metrics", "Interpret performance charts", "Analyze team performance", "Export custom reports"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Analytics overview"},
   {"time": "0:30", "title": "Key Metrics", "description": "Understanding KPIs"},
   {"time": "2:00", "title": "Team Performance", "description": "Agent comparison and stats"},
   {"time": "4:00", "title": "Customer Insights", "description": "Behavior and satisfaction"},
   {"time": "6:00", "title": "Custom Reports", "description": "Building and exporting reports"},
   {"time": "7:30", "title": "Conclusion", "description": "Analytics mastered"}
 ]',
 '["analytics-dashboard", "performance-metrics", "team-analytics", "custom-reports"]',
 ARRAY['analytics', 'metrics', 'reports', 'performance', 'kpis', 'data']
),

(12,
 'Bulk Messaging - Send Messages at Scale',
 'Learn bulk messaging correctly, understand WhatsApp limitations, maintain compliance, and track campaign performance.',
 450, -- 7.5 minutes
 'Core Features',
 'Core Features Series',
 'Advanced',
 '["Send bulk messages correctly", "Understand WhatsApp limitations", "Maintain compliance", "Track campaign performance"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Bulk messaging overview"},
   {"time": "0:30", "title": "Bulk Basics", "description": "Requirements and compliance"},
   {"time": "2:00", "title": "Creating Campaigns", "description": "Building bulk message campaign"},
   {"time": "4:00", "title": "Monitoring Campaigns", "description": "Tracking delivery and responses"},
   {"time": "5:30", "title": "Best Practices", "description": "Bulk messaging tips"},
   {"time": "7:00", "title": "Conclusion", "description": "Campaigns ready"}
 ]',
 '["bulk-messaging", "broadcast-campaigns", "mass-messaging", "compliance"]',
 ARRAY['bulk messaging', 'campaigns', 'broadcast', 'compliance', 'scale', 'mass messaging']
),

(13,
 'Advanced Search and Filters - Find Anything Fast',
 'Master search operators, save filters, use advanced search techniques, and find information instantly across all data.',
 330, -- 5.5 minutes
 'Core Features',
 'Core Features Series',
 'Intermediate',
 '["Master search operators", "Save frequent searches", "Find information instantly", "Use advanced filters"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Search capabilities overview"},
   {"time": "0:30", "title": "Basic Search", "description": "Search bar and basics"},
   {"time": "1:30", "title": "Advanced Operators", "description": "Boolean and field search"},
   {"time": "3:00", "title": "Saved Searches", "description": "Quick access to frequent searches"},
   {"time": "4:00", "title": "Search Within", "description": "Conversation-level search"},
   {"time": "5:00", "title": "Conclusion", "description": "Search mastered"}
 ]',
 '["advanced-search", "search-operators", "filters", "saved-searches"]',
 ARRAY['search', 'filters', 'advanced search', 'operators', 'find', 'query']
);

-- =====================================================
-- ADVANCED FEATURES SERIES (Videos 14-17)
-- =====================================================

INSERT INTO video_tutorials (video_number, title, description, duration_seconds, category, series, difficulty_level, learning_objectives, chapter_markers, related_articles, tags) VALUES
(14,
 'Advanced Automation - Multi-Step Workflows and Logic',
 'Build complex workflows, use conditional logic, implement branching paths, and create intelligent automation that adapts to customer behavior.',
 660, -- 11 minutes
 'Advanced Features',
 'Advanced Features Series',
 'Advanced',
 '["Build complex multi-step workflows", "Use conditional logic effectively", "Implement branching paths", "Test and optimize workflows"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Advanced automation overview"},
   {"time": "0:40", "title": "Workflow Architecture", "description": "Multi-step design principles"},
   {"time": "2:00", "title": "Lead Qualification Workflow", "description": "Building real-world example"},
   {"time": "5:00", "title": "Variables and Dynamic Content", "description": "Personalization at scale"},
   {"time": "7:00", "title": "Time-Based Automation", "description": "Scheduled and delayed actions"},
   {"time": "9:00", "title": "Testing and Optimization", "description": "Ensuring workflow success"},
   {"time": "10:30", "title": "Conclusion", "description": "Advanced automation mastered"}
 ]',
 '["advanced-automation", "multi-step-workflows", "conditional-logic", "workflow-optimization"]',
 ARRAY['advanced automation', 'workflows', 'logic', 'branching', 'conditional', 'complex']
),

(15,
 'API Integration - Connect ADSapp to Your Stack',
 'Use webhooks effectively, access REST API, integrate with CRM and tools, and build custom integrations tailored to your business.',
 840, -- 14 minutes
 'Advanced Features',
 'Advanced Features Series',
 'Advanced',
 '["Use webhooks for real-time integration", "Access REST API programmatically", "Integrate with CRM systems", "Build custom integrations"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "API integration overview"},
   {"time": "0:40", "title": "Webhook Fundamentals", "description": "Real-time event notifications"},
   {"time": "3:00", "title": "REST API Overview", "description": "Programmatic access"},
   {"time": "6:00", "title": "CRM Integration Examples", "description": "Salesforce and HubSpot"},
   {"time": "9:00", "title": "Custom Integration", "description": "Building Slack integration"},
   {"time": "12:00", "title": "Zapier Integration", "description": "No-code automation"},
   {"time": "14:00", "title": "Conclusion", "description": "Integration complete"}
 ]',
 '["api-integration", "webhooks", "rest-api", "crm-integration", "zapier"]',
 ARRAY['api', 'integration', 'webhooks', 'rest', 'crm', 'zapier', 'custom']
),

(16,
 'Custom Reporting and Data Export',
 'Build custom reports, schedule automated delivery, export data in various formats, and maintain data ownership.',
 540, -- 9 minutes
 'Advanced Features',
 'Advanced Features Series',
 'Advanced',
 '["Build custom reports", "Schedule automated delivery", "Export data effectively", "Analyze trends"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Custom reporting overview"},
   {"time": "0:30", "title": "Report Builder", "description": "Drag-and-drop reporting"},
   {"time": "3:00", "title": "Scheduled Reports", "description": "Automated email delivery"},
   {"time": "5:00", "title": "Data Export Formats", "description": "CSV, Excel, JSON, PDF"},
   {"time": "7:00", "title": "Advanced Analytics", "description": "Cohorts, funnels, trends"},
   {"time": "9:00", "title": "Conclusion", "description": "Reporting mastered"}
 ]',
 '["custom-reporting", "data-export", "scheduled-reports", "advanced-analytics"]',
 ARRAY['reporting', 'export', 'data', 'analytics', 'custom reports', 'schedules']
),

(17,
 'Security Best Practices and Compliance',
 'Implement security protocols, maintain GDPR compliance, audit access, and protect customer data with enterprise-grade security.',
 660, -- 11 minutes
 'Advanced Features',
 'Advanced Features Series',
 'Advanced',
 '["Implement security best practices", "Maintain GDPR compliance", "Audit access and activities", "Respond to security incidents"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Security overview"},
   {"time": "0:40", "title": "Access Control", "description": "Principle of least privilege"},
   {"time": "3:00", "title": "Data Protection", "description": "Encryption and secure storage"},
   {"time": "5:00", "title": "GDPR Compliance", "description": "European data protection"},
   {"time": "8:00", "title": "Audit and Monitoring", "description": "Activity tracking"},
   {"time": "10:00", "title": "Incident Response", "description": "Security protocol"},
   {"time": "11:00", "title": "Conclusion", "description": "Security implemented"}
 ]',
 '["security-best-practices", "gdpr-compliance", "access-control", "audit-logging"]',
 ARRAY['security', 'compliance', 'gdpr', 'audit', 'data protection', 'access control']
);

-- =====================================================
-- INDUSTRY USE CASES SERIES (Videos 18-20)
-- =====================================================

INSERT INTO video_tutorials (video_number, title, description, duration_seconds, category, series, difficulty_level, learning_objectives, chapter_markers, related_articles, tags) VALUES
(18,
 'E-commerce Customer Support Workflows',
 'Implement e-commerce workflows, handle order inquiries, manage returns, and automate order updates for online retail businesses.',
 540, -- 9 minutes
 'Use Cases',
 'Industry Use Cases Series',
 'Intermediate',
 '["Implement e-commerce workflows", "Handle order inquiries efficiently", "Manage returns and refunds", "Automate order updates"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "E-commerce use case overview"},
   {"time": "0:30", "title": "Pre-Purchase Support", "description": "Product questions and guidance"},
   {"time": "2:30", "title": "Order Tracking", "description": "Automated order updates"},
   {"time": "5:00", "title": "Post-Purchase Support", "description": "Customer service workflows"},
   {"time": "7:00", "title": "Returns and Refunds", "description": "Return process automation"},
   {"time": "9:00", "title": "Conclusion", "description": "E-commerce workflows complete"}
 ]',
 '["ecommerce-workflows", "order-management", "returns-processing", "customer-support"]',
 ARRAY['ecommerce', 'retail', 'orders', 'returns', 'customer support', 'online store']
),

(19,
 'Real Estate Lead Nurturing Automation',
 'Qualify real estate leads, automate property matching, schedule viewings, and maintain long-term prospect relationships.',
 540, -- 9 minutes
 'Use Cases',
 'Industry Use Cases Series',
 'Intermediate',
 '["Qualify real estate leads", "Automate property matching", "Schedule viewings efficiently", "Maintain long-term nurture"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Real estate use case overview"},
   {"time": "0:30", "title": "Lead Qualification", "description": "Automated lead scoring"},
   {"time": "3:00", "title": "Property Matching", "description": "Automated suggestions"},
   {"time": "5:00", "title": "Viewing Scheduling", "description": "Calendar integration"},
   {"time": "7:00", "title": "Nurture Sequences", "description": "Long-term follow-up"},
   {"time": "9:00", "title": "Conclusion", "description": "Real estate workflows active"}
 ]',
 '["real-estate-workflows", "lead-qualification", "property-matching", "viewing-scheduling"]',
 ARRAY['real estate', 'leads', 'nurturing', 'properties', 'viewings', 'agents']
),

(20,
 'Healthcare Appointment Management System',
 'Implement HIPAA-compliant appointment booking, send automated reminders, handle rescheduling, and reduce no-shows effectively.',
 540, -- 9 minutes
 'Use Cases',
 'Industry Use Cases Series',
 'Advanced',
 '["Implement HIPAA-compliant booking", "Send automated reminders", "Handle rescheduling smoothly", "Reduce no-show rates"]',
 '[
   {"time": "0:00", "title": "Introduction", "description": "Healthcare use case overview"},
   {"time": "0:30", "title": "Compliance and Privacy", "description": "HIPAA considerations"},
   {"time": "2:00", "title": "Appointment Booking", "description": "Automated booking flow"},
   {"time": "4:30", "title": "Reminder System", "description": "Multi-stage reminders"},
   {"time": "6:30", "title": "Rescheduling", "description": "Easy change process"},
   {"time": "8:00", "title": "Post-Appointment Follow-up", "description": "Care continuation"},
   {"time": "9:00", "title": "Conclusion", "description": "Healthcare workflows complete"}
 ]',
 '["healthcare-workflows", "appointment-booking", "hipaa-compliance", "appointment-reminders"]',
 ARRAY['healthcare', 'appointments', 'hipaa', 'reminders', 'booking', 'medical']
);

-- =====================================================
-- Create video playlists for organization
-- =====================================================

CREATE TABLE IF NOT EXISTS video_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  video_ids INTEGER[],
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO video_playlists (name, description, video_ids, display_order) VALUES
('Getting Started with ADSapp',
 'Complete onboarding series for new users. Learn the basics, connect WhatsApp, and invite your team.',
 ARRAY[1, 2, 3, 4, 5],
 1),

('Core Features Mastery',
 'Master all core ADSapp features including inbox management, templates, contacts, automation, and analytics.',
 ARRAY[6, 7, 8, 9, 10, 11, 12, 13],
 2),

('Advanced Features and Integration',
 'Advanced automation, API integration, custom reporting, and security best practices for power users.',
 ARRAY[14, 15, 16, 17],
 3),

('Industry-Specific Use Cases',
 'Real-world implementations for E-commerce, Real Estate, and Healthcare industries.',
 ARRAY[18, 19, 20],
 4),

('Complete ADSapp Video Series',
 'All 20 video tutorials from beginner to advanced. Complete mastery of the ADSapp platform.',
 ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
 0);

-- =====================================================
-- Create views for easy querying
-- =====================================================

CREATE OR REPLACE VIEW video_series_summary AS
SELECT
  series,
  COUNT(*) as video_count,
  SUM(duration_seconds) as total_duration_seconds,
  ROUND(SUM(duration_seconds) / 60.0, 1) as total_duration_minutes,
  MIN(difficulty_level) as min_difficulty,
  MAX(difficulty_level) as max_difficulty
FROM video_tutorials
GROUP BY series
ORDER BY
  CASE series
    WHEN 'Getting Started Series' THEN 1
    WHEN 'Core Features Series' THEN 2
    WHEN 'Advanced Features Series' THEN 3
    WHEN 'Industry Use Cases Series' THEN 4
  END;

-- =====================================================
-- Sample queries for reference
-- =====================================================

-- Get all beginner videos in order
-- SELECT video_number, title, duration_seconds
-- FROM video_tutorials
-- WHERE difficulty_level = 'Beginner'
-- ORDER BY video_number;

-- Get videos by series
-- SELECT series, COUNT(*), SUM(duration_seconds) as total_seconds
-- FROM video_tutorials
-- GROUP BY series;

-- Find videos by tag
-- SELECT title, tags
-- FROM video_tutorials
-- WHERE 'automation' = ANY(tags);

-- Get complete playlist info
-- SELECT p.name, v.video_number, v.title
-- FROM video_playlists p
-- CROSS JOIN LATERAL unnest(p.video_ids) AS video_id
-- JOIN video_tutorials v ON v.video_number = video_id
-- WHERE p.name = 'Getting Started with ADSapp'
-- ORDER BY array_position(p.video_ids, video_id);

-- =====================================================
-- Verification queries
-- =====================================================

-- Check all videos inserted correctly
SELECT
  video_number,
  title,
  series,
  difficulty_level,
  duration_seconds,
  array_length(chapter_markers::json->0, 1) as chapter_count
FROM video_tutorials
ORDER BY video_number;

-- Verify series totals
SELECT * FROM video_series_summary;

-- Check playlists created
SELECT name, array_length(video_ids, 1) as video_count
FROM video_playlists
ORDER BY display_order;

-- =====================================================
-- Success message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✓ Video tutorials seeded successfully!';
  RAISE NOTICE '  - 20 video tutorials created';
  RAISE NOTICE '  - 5 playlists organized';
  RAISE NOTICE '  - Total duration: ~160 minutes';
  RAISE NOTICE '  - Ready for production!';
END $$;
