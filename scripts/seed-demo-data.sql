-- Demo Data Seeding Script
-- This script seeds realistic demo data for different business scenarios

-- Function to seed demo organization with realistic data
CREATE OR REPLACE FUNCTION seed_demo_organization_data(
  org_id UUID,
  template_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  template_config JSONB;
  contact_record RECORD;
  conversation_record RECORD;
  message_content TEXT[];
  automation_rules JSONB[];
  message_templates JSONB[];
  i INTEGER;
  j INTEGER;
  contact_count INTEGER;
  conversation_count INTEGER;
  days_back INTEGER;
  current_time TIMESTAMPTZ;
BEGIN
  -- Get template configuration
  SELECT configuration INTO template_config
  FROM demo_organizations
  WHERE demo_organizations.template_type = seed_demo_organization_data.template_type
    AND is_active = true
  LIMIT 1;

  IF template_config IS NULL THEN
    template_config := '{}'::jsonb;
  END IF;

  -- Set variables based on template type
  CASE template_type
    WHEN 'ecommerce' THEN
      contact_count := 25;
      conversation_count := 40;
      message_content := ARRAY[
        'Hi! I''d like to know about your return policy',
        'When will my order #12345 be shipped?',
        'Do you have this dress in size M?',
        'I received the wrong item, how can I exchange it?',
        'Are there any discounts for bulk orders?',
        'What''s the delivery time to New York?',
        'I love the quality of your products!',
        'Can you help me track my package?',
        'Is this item available in blue?',
        'How do I use my discount code?'
      ];
    WHEN 'restaurant' THEN
      contact_count := 20;
      conversation_count := 35;
      message_content := ARRAY[
        'Hi! I''d like to make a reservation for tonight',
        'Do you have vegetarian options?',
        'What time do you close today?',
        'Can I order takeout?',
        'Do you deliver to downtown area?',
        'What''s today''s special?',
        'I have a food allergy, can you help?',
        'Great dinner last night, thank you!',
        'Can I book a table for 6 people?',
        'Do you accept group reservations?'
      ];
    WHEN 'saas' THEN
      contact_count := 30;
      conversation_count := 45;
      message_content := ARRAY[
        'I''m having trouble logging into my account',
        'How do I upgrade my subscription?',
        'Can you help me set up integrations?',
        'I need help with the API documentation',
        'Is there a mobile app available?',
        'When will the new features be released?',
        'I''d like to request a demo',
        'How do I export my data?',
        'Can I get a refund for this month?',
        'Your platform is amazing!'
      ];
    WHEN 'healthcare' THEN
      contact_count := 18;
      conversation_count := 30;
      message_content := ARRAY[
        'I need to schedule an appointment',
        'Can I get my test results?',
        'What are your office hours?',
        'Do you accept my insurance?',
        'I need to reschedule my appointment',
        'Can you send me the prescription?',
        'Is the doctor available for consultation?',
        'What should I bring to my appointment?',
        'Thank you for the excellent care',
        'I have an emergency, are you open?'
      ];
    WHEN 'education' THEN
      contact_count := 22;
      conversation_count := 38;
      message_content := ARRAY[
        'How do I enroll in the course?',
        'When does the next batch start?',
        'Can I get a certificate?',
        'I''m having trouble accessing the materials',
        'Are there any scholarships available?',
        'Can I get a refund if I cancel?',
        'How long is the course?',
        'Do you offer job placement assistance?',
        'The course content is excellent!',
        'Can I speak with an advisor?'
      ];
    WHEN 'retail' THEN
      contact_count := 20;
      conversation_count := 32;
      message_content := ARRAY[
        'Do you have this product in stock?',
        'What''s the warranty on this item?',
        'Can you help me with technical support?',
        'Where is your nearest store location?',
        'Do you price match competitors?',
        'Can I return this without a receipt?',
        'Is installation service available?',
        'What payment methods do you accept?',
        'Great service, highly recommend!',
        'Can you hold this item for me?'
      ];
    ELSE
      contact_count := 15;
      conversation_count := 25;
      message_content := ARRAY[
        'Hello, I need some information',
        'Can you help me with my inquiry?',
        'Thank you for your service',
        'I have a question about your services',
        'Great customer support!'
      ];
  END CASE;

  -- Create realistic contacts
  FOR i IN 1..contact_count LOOP
    INSERT INTO contacts (
      organization_id,
      whatsapp_id,
      phone_number,
      name,
      tags,
      notes,
      last_message_at,
      created_at
    ) VALUES (
      org_id,
      '+1555010' || LPAD(i::text, 4, '0'),
      '+1555010' || LPAD(i::text, 4, '0'),
      CASE (i % 20)
        WHEN 1 THEN 'Sarah Johnson'
        WHEN 2 THEN 'Michael Chen'
        WHEN 3 THEN 'Emma Rodriguez'
        WHEN 4 THEN 'James Wilson'
        WHEN 5 THEN 'Olivia Brown'
        WHEN 6 THEN 'David Kim'
        WHEN 7 THEN 'Sophie Davis'
        WHEN 8 THEN 'Alex Thompson'
        WHEN 9 THEN 'Maria Garcia'
        WHEN 10 THEN 'Robert Anderson'
        WHEN 11 THEN 'Lisa Wang'
        WHEN 12 THEN 'Carlos Martinez'
        WHEN 13 THEN 'Jennifer Lee'
        WHEN 14 THEN 'Ryan O''Connor'
        WHEN 15 THEN 'Amanda Taylor'
        WHEN 16 THEN 'Kevin Zhang'
        WHEN 17 THEN 'Rachel Green'
        WHEN 18 THEN 'Daniel Park'
        WHEN 19 THEN 'Ashley Miller'
        ELSE 'Customer #' || i
      END,
      CASE template_type
        WHEN 'ecommerce' THEN ARRAY['customer', CASE WHEN i % 3 = 0 THEN 'vip' ELSE 'regular' END]
        WHEN 'restaurant' THEN ARRAY['diner', CASE WHEN i % 4 = 0 THEN 'frequent' ELSE 'occasional' END]
        WHEN 'saas' THEN ARRAY['user', CASE WHEN i % 5 = 0 THEN 'enterprise' WHEN i % 3 = 0 THEN 'pro' ELSE 'starter' END]
        WHEN 'healthcare' THEN ARRAY['patient', CASE WHEN i % 6 = 0 THEN 'regular' ELSE 'new' END]
        WHEN 'education' THEN ARRAY['student', CASE WHEN i % 4 = 0 THEN 'enrolled' ELSE 'prospect' END]
        WHEN 'retail' THEN ARRAY['customer', CASE WHEN i % 5 = 0 THEN 'member' ELSE 'visitor' END]
        ELSE ARRAY['contact']
      END,
      CASE WHEN i % 7 = 0 THEN 'Important customer - handle with priority' ELSE NULL END,
      NOW() - (RANDOM() * INTERVAL '30 days'),
      NOW() - (RANDOM() * INTERVAL '60 days')
    );
  END LOOP;

  -- Create conversations with realistic message exchanges
  FOR i IN 1..conversation_count LOOP
    days_back := (RANDOM() * 30)::INTEGER;
    current_time := NOW() - (days_back || ' days')::INTERVAL + (RANDOM() * INTERVAL '12 hours');

    -- Insert conversation
    INSERT INTO conversations (
      organization_id,
      contact_id,
      status,
      priority,
      subject,
      last_message_at,
      created_at
    ) VALUES (
      org_id,
      (SELECT id FROM contacts WHERE organization_id = org_id ORDER BY RANDOM() LIMIT 1),
      CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'open'
        WHEN 1 THEN 'pending'
        WHEN 2 THEN 'resolved'
        ELSE 'closed'
      END,
      CASE (RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'medium'
        WHEN 2 THEN 'high'
        ELSE 'urgent'
      END,
      message_content[(RANDOM() * (array_length(message_content, 1) - 1) + 1)::INTEGER],
      current_time,
      current_time
    );

    -- Get the conversation ID for messages
    SELECT id INTO conversation_record
    FROM conversations
    WHERE organization_id = org_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Create 2-8 messages per conversation
    FOR j IN 1..(2 + (RANDOM() * 6)::INTEGER) LOOP
      current_time := current_time + (RANDOM() * INTERVAL '2 hours');

      INSERT INTO messages (
        conversation_id,
        sender_type,
        content,
        message_type,
        is_read,
        created_at
      ) VALUES (
        conversation_record.id,
        CASE WHEN j % 2 = 1 THEN 'contact' ELSE 'agent' END,
        CASE WHEN j % 2 = 1
          THEN message_content[(RANDOM() * (array_length(message_content, 1) - 1) + 1)::INTEGER]
          ELSE CASE template_type
            WHEN 'ecommerce' THEN CASE (RANDOM() * 5)::INTEGER
              WHEN 0 THEN 'Thank you for contacting us! I''ll help you with that right away.'
              WHEN 1 THEN 'Your order has been processed and will ship within 24 hours.'
              WHEN 2 THEN 'Our return policy allows returns within 30 days of purchase.'
              WHEN 3 THEN 'I''ve sent you the tracking information via email.'
              ELSE 'Is there anything else I can help you with today?'
            END
            WHEN 'restaurant' THEN CASE (RANDOM() * 5)::INTEGER
              WHEN 0 THEN 'Hi! I''d be happy to help you with your reservation.'
              WHEN 1 THEN 'We have several vegetarian options available on our menu.'
              WHEN 2 THEN 'Your table for tonight at 7 PM is confirmed!'
              WHEN 3 THEN 'We deliver within a 5-mile radius, usually within 45 minutes.'
              ELSE 'Thank you for choosing our restaurant!'
            END
            WHEN 'saas' THEN CASE (RANDOM() * 5)::INTEGER
              WHEN 0 THEN 'I''ll walk you through the setup process step by step.'
              WHEN 1 THEN 'You can upgrade your plan anytime from your account dashboard.'
              WHEN 2 THEN 'I''ve reset your password. Please check your email.'
              WHEN 3 THEN 'Our API documentation is available at docs.example.com'
              ELSE 'Let me connect you with our technical specialist.'
            END
            WHEN 'healthcare' THEN CASE (RANDOM() * 5)::INTEGER
              WHEN 0 THEN 'I can schedule an appointment for you next week.'
              WHEN 1 THEN 'Your test results will be available in 2-3 business days.'
              WHEN 2 THEN 'We''re open Monday through Friday, 8 AM to 5 PM.'
              WHEN 3 THEN 'Yes, we accept most major insurance plans.'
              ELSE 'Please bring your ID and insurance card to your appointment.'
            END
            WHEN 'education' THEN CASE (RANDOM() * 5)::INTEGER
              WHEN 0 THEN 'The next course batch starts on the 15th of next month.'
              WHEN 1 THEN 'Yes, you''ll receive a certificate upon successful completion.'
              WHEN 2 THEN 'I''ve sent you the course enrollment link.'
              WHEN 3 THEN 'We offer several scholarship programs for qualified students.'
              ELSE 'Our career services team will help with job placement.'
            END
            WHEN 'retail' THEN CASE (RANDOM() * 5)::INTEGER
              WHEN 0 THEN 'Yes, we have that item in stock at our downtown location.'
              WHEN 1 THEN 'All our electronics come with a 2-year manufacturer warranty.'
              WHEN 2 THEN 'I''ll transfer you to our technical support team.'
              WHEN 3 THEN 'You can return items within 30 days with a receipt.'
              ELSE 'We offer free installation on appliances over $500.'
            END
            ELSE 'Thank you for your message. How can I assist you today?'
          END
        END,
        'text',
        CASE WHEN j % 2 = 0 OR RANDOM() > 0.3 THEN true ELSE false END,
        current_time
      );
    END LOOP;

    -- Update conversation with last message time
    UPDATE conversations
    SET last_message_at = current_time
    WHERE id = conversation_record.id;
  END LOOP;

  -- Create automation rules based on template type
  automation_rules := CASE template_type
    WHEN 'ecommerce' THEN ARRAY[
      '{"name": "Welcome New Customers", "trigger_type": "first_message", "trigger_conditions": {}, "actions": {"send_message": "Welcome to StyleHub! How can we help you today?", "add_tag": "new_customer"}}'::jsonb,
      '{"name": "Order Status Inquiry", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["order", "shipping", "delivery", "track"]}, "actions": {"send_message": "I can help you track your order. Please provide your order number.", "assign_to_team": "order_support"}}'::jsonb,
      '{"name": "Returns and Exchanges", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["return", "exchange", "refund", "wrong item"]}, "actions": {"send_message": "I''ll help you with your return. Our return policy allows returns within 30 days.", "set_priority": "high"}}'::jsonb
    ]
    WHEN 'restaurant' THEN ARRAY[
      '{"name": "Reservation Requests", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["reservation", "book", "table", "tonight"]}, "actions": {"send_message": "I''d be happy to help you with a reservation. What date and time work for you?", "add_tag": "reservation"}}'::jsonb,
      '{"name": "Menu Inquiries", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["menu", "vegetarian", "vegan", "special", "allergy"]}, "actions": {"send_message": "You can view our full menu at bellavista.com/menu. Do you have any dietary restrictions?", "add_tag": "menu_inquiry"}}'::jsonb,
      '{"name": "Delivery Questions", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["delivery", "takeout", "pickup", "order"]}, "actions": {"send_message": "We deliver within 5 miles! Delivery usually takes 45-60 minutes. What would you like to order?", "add_tag": "delivery"}}'::jsonb
    ]
    WHEN 'saas' THEN ARRAY[
      '{"name": "Technical Support", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["bug", "error", "not working", "help", "issue"]}, "actions": {"send_message": "I''m sorry you''re experiencing issues. Let me connect you with our technical team.", "assign_to_team": "technical_support", "set_priority": "high"}}'::jsonb,
      '{"name": "Billing Inquiries", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["billing", "payment", "invoice", "upgrade", "downgrade"]}, "actions": {"send_message": "I can help you with billing questions. You can view your account details at cloudflow.com/billing", "add_tag": "billing"}}'::jsonb,
      '{"name": "Feature Requests", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["feature", "request", "suggestion", "enhancement"]}, "actions": {"send_message": "Thanks for the feedback! I''ll forward your suggestion to our product team.", "add_tag": "feature_request"}}'::jsonb
    ]
    WHEN 'healthcare' THEN ARRAY[
      '{"name": "Appointment Scheduling", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["appointment", "schedule", "book", "availability"]}, "actions": {"send_message": "I can help you schedule an appointment. What type of visit do you need?", "add_tag": "appointment"}}'::jsonb,
      '{"name": "Emergency Inquiries", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["emergency", "urgent", "pain", "help"]}, "actions": {"send_message": "For medical emergencies, please call 911. For urgent care, please call our office at (555) 123-4567.", "set_priority": "urgent"}}'::jsonb,
      '{"name": "Test Results", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["results", "test", "lab", "report"]}, "actions": {"send_message": "Test results are typically available within 2-3 business days. I can check the status for you.", "add_tag": "test_results"}}'::jsonb
    ]
    WHEN 'education' THEN ARRAY[
      '{"name": "Course Enrollment", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["enroll", "register", "course", "program"]}, "actions": {"send_message": "I''d be happy to help you enroll! Which course are you interested in?", "add_tag": "enrollment"}}'::jsonb,
      '{"name": "Technical Issues", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["login", "access", "password", "not working"]}, "actions": {"send_message": "I can help you resolve technical issues. Let me walk you through the troubleshooting steps.", "assign_to_team": "tech_support"}}'::jsonb,
      '{"name": "Career Services", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["job", "career", "placement", "resume"]}, "actions": {"send_message": "Our career services team is here to help! I''ll connect you with a career advisor.", "add_tag": "career_services"}}'::jsonb
    ]
    WHEN 'retail' THEN ARRAY[
      '{"name": "Product Availability", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["stock", "available", "inventory", "have"]}, "actions": {"send_message": "I can check product availability for you. What item are you looking for?", "add_tag": "inventory_check"}}'::jsonb,
      '{"name": "Technical Support", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["warranty", "repair", "broken", "support"]}, "actions": {"send_message": "I''ll connect you with our technical support team for warranty and repair services.", "assign_to_team": "tech_support"}}'::jsonb,
      '{"name": "Store Locations", "trigger_type": "keyword", "trigger_conditions": {"keywords": ["location", "store", "address", "hours"]}, "actions": {"send_message": "You can find our store locations and hours at techgear.com/locations. Is there a specific location you''re looking for?", "add_tag": "store_info"}}'::jsonb
    ]
    ELSE ARRAY[
      '{"name": "General Welcome", "trigger_type": "first_message", "trigger_conditions": {}, "actions": {"send_message": "Hello! Welcome to our customer service. How can I help you today?"}}'::jsonb
    ]
  END;

  -- Insert automation rules
  FOR i IN 1..array_length(automation_rules, 1) LOOP
    INSERT INTO automation_rules (
      organization_id,
      name,
      description,
      trigger_type,
      trigger_conditions,
      actions,
      is_active
    ) VALUES (
      org_id,
      automation_rules[i]->>'name',
      'Auto-generated demo rule for ' || (automation_rules[i]->>'name'),
      automation_rules[i]->>'trigger_type',
      COALESCE(automation_rules[i]->'trigger_conditions', '{}'::jsonb),
      COALESCE(automation_rules[i]->'actions', '{}'::jsonb),
      true
    );
  END LOOP;

  -- Create message templates based on template type
  message_templates := CASE template_type
    WHEN 'ecommerce' THEN ARRAY[
      '{"name": "Order Confirmation", "content": "Thank you for your order! Your order number is {order_number}. We''ll send you tracking information once it ships.", "category": "orders", "variables": ["order_number"]}'::jsonb,
      '{"name": "Shipping Update", "content": "Great news! Your order {order_number} has shipped. Track it here: {tracking_link}", "category": "shipping", "variables": ["order_number", "tracking_link"]}'::jsonb,
      '{"name": "Return Instructions", "content": "To return your item, please print the return label from your account and drop it off at any shipping location. Returns are processed within 5-7 business days.", "category": "returns", "variables": []}'::jsonb,
      '{"name": "Size Guide", "content": "You can find our size guide at {size_guide_link}. If you''re between sizes, we recommend sizing up for comfort.", "category": "product_info", "variables": ["size_guide_link"]}'::jsonb
    ]
    WHEN 'restaurant' THEN ARRAY[
      '{"name": "Reservation Confirmation", "content": "Your reservation for {party_size} people on {date} at {time} is confirmed. We look forward to serving you!", "category": "reservations", "variables": ["party_size", "date", "time"]}'::jsonb,
      '{"name": "Menu Information", "content": "Our current menu is available at bellavista.com/menu. Today''s special is {special_dish}. All dishes can be customized for dietary restrictions.", "category": "menu", "variables": ["special_dish"]}'::jsonb,
      '{"name": "Delivery ETA", "content": "Your order is being prepared and will be delivered in approximately {delivery_time} minutes to {address}.", "category": "delivery", "variables": ["delivery_time", "address"]}'::jsonb,
      '{"name": "Allergy Information", "content": "We take allergies seriously. Please inform your server about any allergies when you arrive. Our chef can prepare most dishes allergen-free.", "category": "allergies", "variables": []}'::jsonb
    ]
    WHEN 'saas' THEN ARRAY[
      '{"name": "Welcome Onboarding", "content": "Welcome to CloudFlow! I''ve sent you a getting started guide to {email}. Your account is ready at {login_link}.", "category": "onboarding", "variables": ["email", "login_link"]}'::jsonb,
      '{"name": "Password Reset", "content": "I''ve sent a password reset link to {email}. The link will expire in 24 hours. If you don''t receive it, please check your spam folder.", "category": "account", "variables": ["email"]}'::jsonb,
      '{"name": "Feature Explanation", "content": "The {feature_name} feature allows you to {feature_description}. You can find documentation at {docs_link}.", "category": "features", "variables": ["feature_name", "feature_description", "docs_link"]}'::jsonb,
      '{"name": "Billing Update", "content": "Your {plan_name} subscription has been updated. The changes will take effect on {effective_date}. View your invoice at {billing_link}.", "category": "billing", "variables": ["plan_name", "effective_date", "billing_link"]}'::jsonb
    ]
    WHEN 'healthcare' THEN ARRAY[
      '{"name": "Appointment Confirmation", "content": "Your appointment with Dr. {doctor_name} on {date} at {time} is confirmed. Please arrive 15 minutes early with your insurance card and ID.", "category": "appointments", "variables": ["doctor_name", "date", "time"]}'::jsonb,
      '{"name": "Appointment Reminder", "content": "Reminder: You have an appointment tomorrow at {time} with Dr. {doctor_name}. Please call if you need to reschedule.", "category": "reminders", "variables": ["time", "doctor_name"]}'::jsonb,
      '{"name": "Test Results Available", "content": "Your test results from {test_date} are now available. Please call the office to discuss the results with Dr. {doctor_name}.", "category": "results", "variables": ["test_date", "doctor_name"]}'::jsonb,
      '{"name": "Prescription Ready", "content": "Your prescription for {medication} is ready for pickup at {pharmacy_name}. The pharmacy is open until {closing_time}.", "category": "prescriptions", "variables": ["medication", "pharmacy_name", "closing_time"]}'::jsonb
    ]
    WHEN 'education' THEN ARRAY[
      '{"name": "Enrollment Confirmation", "content": "Welcome to {course_name}! Your enrollment is confirmed. The course starts on {start_date}. Access your materials at {course_link}.", "category": "enrollment", "variables": ["course_name", "start_date", "course_link"]}'::jsonb,
      '{"name": "Assignment Reminder", "content": "Reminder: Your assignment for {course_name} is due on {due_date}. Submit it through the course portal before 11:59 PM.", "category": "assignments", "variables": ["course_name", "due_date"]}'::jsonb,
      '{"name": "Technical Support", "content": "For technical issues, try clearing your browser cache first. If the problem persists, contact our IT team at {support_email} or call {support_phone}.", "category": "technical", "variables": ["support_email", "support_phone"]}'::jsonb,
      '{"name": "Certificate Information", "content": "You''ll receive your certificate for {course_name} within 2 weeks of completion. Certificates are sent to {email} and are also available in your student portal.", "category": "certificates", "variables": ["course_name", "email"]}'::jsonb
    ]
    WHEN 'retail' THEN ARRAY[
      '{"name": "Product Information", "content": "The {product_name} is currently in stock at our {store_location} location. It includes a {warranty_period} warranty and free setup service.", "category": "products", "variables": ["product_name", "store_location", "warranty_period"]}'::jsonb,
      '{"name": "Warranty Claim", "content": "To process your warranty claim for {product_name}, please bring your receipt and the item to any of our stores. We''ll process it within 3-5 business days.", "category": "warranty", "variables": ["product_name"]}'::jsonb,
      '{"name": "Installation Service", "content": "Installation for {product_name} can be scheduled for {installation_date}. Our technician will call 30 minutes before arrival. Service fee: {service_fee}.", "category": "installation", "variables": ["product_name", "installation_date", "service_fee"]}'::jsonb,
      '{"name": "Store Hours", "content": "Our {store_location} store is open {store_hours}. You can reach us at {store_phone}. Free parking is available in our lot.", "category": "store_info", "variables": ["store_location", "store_hours", "store_phone"]}'::jsonb
    ]
    ELSE ARRAY[
      '{"name": "General Response", "content": "Thank you for your message. A team member will get back to you within 24 hours during business hours.", "category": "general", "variables": []}'::jsonb
    ]
  END;

  -- Insert message templates
  FOR i IN 1..array_length(message_templates, 1) LOOP
    INSERT INTO message_templates (
      organization_id,
      name,
      content,
      category,
      variables,
      is_active
    ) VALUES (
      org_id,
      message_templates[i]->>'name',
      message_templates[i]->>'content',
      message_templates[i]->>'category',
      ARRAY(SELECT jsonb_array_elements_text(message_templates[i]->'variables')),
      true
    );
  END LOOP;

  -- Create realistic conversation metrics for the past 30 days
  FOR i IN 0..29 LOOP
    INSERT INTO conversation_metrics (
      organization_id,
      date,
      total_conversations,
      new_conversations,
      resolved_conversations,
      avg_response_time,
      avg_resolution_time
    ) VALUES (
      org_id,
      (NOW() - (i || ' days')::INTERVAL)::DATE,
      (5 + (RANDOM() * 15)::INTEGER),
      (1 + (RANDOM() * 8)::INTEGER),
      (1 + (RANDOM() * 10)::INTEGER),
      (INTERVAL '5 minutes') + (RANDOM() * INTERVAL '55 minutes'),
      (INTERVAL '1 hour') + (RANDOM() * INTERVAL '23 hours')
    );
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to seed demo data templates for each business type
CREATE OR REPLACE FUNCTION seed_demo_data_templates()
RETURNS BOOLEAN AS $$
BEGIN
  -- E-commerce demo data templates
  INSERT INTO demo_data_templates (template_type, data_type, name, description, data_content, order_index) VALUES
  ('ecommerce', 'contacts', 'E-commerce Customers', 'Typical e-commerce customer profiles',
   '{"profiles": [
     {"name": "Sarah Johnson", "phone": "+15551234567", "tags": ["vip", "frequent_buyer"], "notes": "Prefers express shipping", "order_history": 12},
     {"name": "Michael Chen", "phone": "+15551234568", "tags": ["new_customer"], "notes": "First-time buyer, interested in electronics", "order_history": 1},
     {"name": "Emma Rodriguez", "phone": "+15551234569", "tags": ["returns_customer"], "notes": "Has returned 2 items, handle with care", "order_history": 5}
   ]}'::jsonb, 1),

  ('ecommerce', 'conversations', 'Order Support Scenarios', 'Common order-related conversations',
   '{"scenarios": [
     {"type": "order_status", "frequency": 35, "avg_messages": 3, "resolution_rate": 95},
     {"type": "returns_exchanges", "frequency": 25, "avg_messages": 4, "resolution_rate": 90},
     {"type": "product_inquiry", "frequency": 20, "avg_messages": 2, "resolution_rate": 98},
     {"type": "shipping_issues", "frequency": 15, "avg_messages": 5, "resolution_rate": 85},
     {"type": "payment_problems", "frequency": 5, "avg_messages": 6, "resolution_rate": 80}
   ]}'::jsonb, 2),

  -- Restaurant demo data templates
  ('restaurant', 'contacts', 'Restaurant Customers', 'Regular diners and delivery customers',
   '{"profiles": [
     {"name": "David Kim", "phone": "+15552345678", "tags": ["frequent_diner", "anniversary"], "notes": "Celebrates anniversary here annually", "visit_count": 24},
     {"name": "Sophie Davis", "phone": "+15552345679", "tags": ["delivery_customer", "vegetarian"], "notes": "Always orders vegetarian options", "order_count": 8},
     {"name": "Alex Thompson", "phone": "+15552345680", "tags": ["large_groups"], "notes": "Often books tables for 8+ people", "group_size": 12}
   ]}'::jsonb, 1),

  ('restaurant', 'analytics', 'Restaurant Metrics', 'Key restaurant performance indicators',
   '{"metrics": {
     "avg_response_time": "3 minutes",
     "reservation_conversion": "78%",
     "peak_hours": ["18:00-20:00", "12:00-13:30"],
     "popular_days": ["Friday", "Saturday", "Sunday"],
     "customer_satisfaction": 4.6,
     "repeat_customer_rate": "65%"
   }}'::jsonb, 3),

  -- SaaS demo data templates
  ('saas', 'contacts', 'SaaS Users', 'Software users across different plan tiers',
   '{"profiles": [
     {"name": "Maria Garcia", "phone": "+15553456789", "tags": ["enterprise", "admin"], "notes": "Primary admin for 50+ user account", "plan": "enterprise"},
     {"name": "Robert Anderson", "phone": "+15553456790", "tags": ["pro_user", "power_user"], "notes": "Uses advanced features regularly", "plan": "professional"},
     {"name": "Lisa Wang", "phone": "+15553456791", "tags": ["trial_user"], "notes": "Day 10 of trial, highly engaged", "plan": "trial"}
   ]}'::jsonb, 1),

  ('saas', 'automation_rules', 'SaaS Automation', 'Common SaaS support automation rules',
   '{"rules": [
     {"name": "Trial Expiration Warning", "trigger": "trial_expires_in_3_days", "action": "send_upgrade_offer"},
     {"name": "Feature Usage Tracking", "trigger": "feature_used_first_time", "action": "send_tutorial"},
     {"name": "Support Ticket Escalation", "trigger": "unresolved_48_hours", "action": "escalate_to_senior"},
     {"name": "Onboarding Check-in", "trigger": "user_inactive_7_days", "action": "send_onboarding_help"}
   ]}'::jsonb, 2),

  -- Healthcare demo data templates
  ('healthcare', 'contacts', 'Healthcare Patients', 'Patient profiles with medical context',
   '{"profiles": [
     {"name": "Jennifer Lee", "phone": "+15554567890", "tags": ["regular_patient", "diabetes"], "notes": "Monthly checkups, diabetic care", "last_visit": "2024-01-15"},
     {"name": "Ryan O''Connor", "phone": "+15554567891", "tags": ["new_patient"], "notes": "First visit scheduled, insurance verified", "insurance": "BlueCross"},
     {"name": "Amanda Taylor", "phone": "+15554567892", "tags": ["urgent_care"], "notes": "Prefers urgent care appointments", "preferred_time": "morning"}
   ]}'::jsonb, 1),

  ('healthcare', 'templates', 'Medical Templates', 'Standard medical communication templates',
   '{"templates": [
     {"name": "Appointment Confirmation", "usage": "high", "compliance": "HIPAA"},
     {"name": "Test Results Notification", "usage": "medium", "compliance": "HIPAA"},
     {"name": "Prescription Ready", "usage": "high", "compliance": "HIPAA"},
     {"name": "Insurance Verification", "usage": "medium", "compliance": "HIPAA"}
   ]}'::jsonb, 2),

  -- Education demo data templates
  ('education', 'contacts', 'Education Students', 'Students and prospective learners',
   '{"profiles": [
     {"name": "Kevin Zhang", "phone": "+15555678901", "tags": ["enrolled", "data_science"], "notes": "Enrolled in Data Science bootcamp", "progress": "60%"},
     {"name": "Rachel Green", "phone": "+15555678902", "tags": ["prospect", "career_change"], "notes": "Interested in UX Design course", "background": "marketing"},
     {"name": "Daniel Park", "phone": "+15555678903", "tags": ["alumni", "job_placement"], "notes": "Graduated last month, seeking job help", "course": "Full Stack Development"}
   ]}'::jsonb, 1),

  -- Retail demo data templates
  ('retail', 'contacts', 'Retail Customers', 'Electronics store customers',
   '{"profiles": [
     {"name": "Ashley Miller", "phone": "+15556789012", "tags": ["loyalty_member", "tech_enthusiast"], "notes": "Member since 2020, buys latest tech", "tier": "gold"},
     {"name": "Carlos Martinez", "phone": "+15556789013", "tags": ["warranty_customer"], "notes": "Recently claimed warranty on laptop", "purchases": 3},
     {"name": "Customer #15", "phone": "+15556789014", "tags": ["walk_in"], "notes": "Browsing tablets, needs assistance", "interest": "tablets"}
   ]}'::jsonb, 1);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to populate demo analytics for all business types
CREATE OR REPLACE FUNCTION seed_demo_analytics()
RETURNS BOOLEAN AS $$
BEGIN
  -- E-commerce analytics
  INSERT INTO demo_analytics (template_type, metric_type, date_range, metric_data) VALUES
  ('ecommerce', 'conversations', '24h', '{"total": 45, "new": 12, "resolved": 38, "avg_response_time": "4m 32s", "satisfaction_score": 4.7}'),
  ('ecommerce', 'conversations', '7d', '{"total": 298, "new": 87, "resolved": 264, "avg_response_time": "6m 15s", "satisfaction_score": 4.6}'),
  ('ecommerce', 'conversations', '30d', '{"total": 1247, "new": 356, "resolved": 1103, "avg_response_time": "7m 42s", "satisfaction_score": 4.5}'),
  ('ecommerce', 'business_metrics', '30d', '{"revenue_impact": "$45,720", "order_conversion": "23%", "cart_abandonment_recovery": "18%", "repeat_purchases": "34%"}'),

  -- Restaurant analytics
  ('restaurant', 'conversations', '24h', '{"total": 32, "new": 9, "resolved": 28, "avg_response_time": "2m 45s", "satisfaction_score": 4.8}'),
  ('restaurant', 'conversations', '7d', '{"total": 187, "new": 54, "resolved": 168, "avg_response_time": "3m 12s", "satisfaction_score": 4.7}'),
  ('restaurant', 'conversations', '30d', '{"total": 743, "new": 201, "resolved": 687, "avg_response_time": "3m 48s", "satisfaction_score": 4.6}'),
  ('restaurant', 'business_metrics', '30d', '{"reservation_conversion": "78%", "table_turnover": "2.3x", "repeat_customers": "65%", "avg_order_value": "$42.50"}'),

  -- SaaS analytics
  ('saas', 'conversations', '24h', '{"total": 67, "new": 18, "resolved": 54, "avg_response_time": "8m 15s", "satisfaction_score": 4.4}'),
  ('saas', 'conversations', '7d', '{"total": 423, "new": 125, "resolved": 376, "avg_response_time": "12m 32s", "satisfaction_score": 4.3}'),
  ('saas', 'conversations', '30d', '{"total": 1834, "new": 489, "resolved": 1654, "avg_response_time": "15m 18s", "satisfaction_score": 4.2}'),
  ('saas', 'business_metrics', '30d', '{"trial_conversion": "18%", "churn_rate": "3.2%", "upgrade_rate": "12%", "support_ticket_deflection": "45%"}'),

  -- Healthcare analytics
  ('healthcare', 'conversations', '24h', '{"total": 28, "new": 8, "resolved": 25, "avg_response_time": "5m 30s", "satisfaction_score": 4.9}'),
  ('healthcare', 'conversations', '7d', '{"total": 156, "new": 42, "resolved": 142, "avg_response_time": "6m 45s", "satisfaction_score": 4.8}'),
  ('healthcare', 'conversations', '30d', '{"total": 634, "new": 167, "resolved": 598, "avg_response_time": "7m 12s", "satisfaction_score": 4.7}'),
  ('healthcare', 'business_metrics', '30d', '{"appointment_booking_rate": "89%", "no_show_rate": "8%", "patient_satisfaction": "4.7/5", "avg_wait_time": "12m"}'),

  -- Education analytics
  ('education', 'conversations', '24h', '{"total": 38, "new": 11, "resolved": 33, "avg_response_time": "6m 20s", "satisfaction_score": 4.6}'),
  ('education', 'conversations', '7d', '{"total": 245, "new": 68, "resolved": 221, "avg_response_time": "8m 15s", "satisfaction_score": 4.5}'),
  ('education', 'conversations', '30d', '{"total": 987, "new": 276, "resolved": 891, "avg_response_time": "9m 45s", "satisfaction_score": 4.4}'),
  ('education', 'business_metrics', '30d', '{"enrollment_conversion": "24%", "course_completion": "87%", "job_placement": "78%", "student_satisfaction": "4.4/5"}'),

  -- Retail analytics
  ('retail', 'conversations', '24h', '{"total": 35, "new": 10, "resolved": 31, "avg_response_time": "4m 15s", "satisfaction_score": 4.5}'),
  ('retail', 'conversations', '7d', '{"total": 213, "new": 59, "resolved": 194, "avg_response_time": "5m 30s", "satisfaction_score": 4.4}'),
  ('retail', 'conversations', '30d', '{"total": 856, "new": 234, "resolved": 776, "avg_response_time": "6m 45s", "satisfaction_score": 4.3}'),
  ('retail', 'business_metrics', '30d', '{"in_store_conversion": "67%", "warranty_claims": "12%", "customer_retention": "71%", "avg_transaction": "$156.80"}');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute seeding functions
SELECT seed_demo_data_templates();
SELECT seed_demo_analytics();

-- Function to create a complete demo environment for testing
CREATE OR REPLACE FUNCTION create_full_demo_environment(template_type TEXT DEFAULT 'ecommerce')
RETURNS TABLE (
  demo_org_id UUID,
  session_token TEXT,
  demo_url TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- Create demo session
  SELECT * INTO result_record
  FROM create_demo_session(template_type, 'demo@example.com', 'Demo User', 24);

  RETURN QUERY SELECT
    result_record.organization_id,
    result_record.session_token,
    'https://yourapp.com/demo/' || result_record.session_token,
    result_record.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;