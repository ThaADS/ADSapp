-- Script om admin account en organisatie aan te maken
-- Voer dit uit NADAT je de hoofdschema hebt toegepast

-- 1. Maak een test organisatie aan
INSERT INTO organizations (id, name, slug, subscription_status, subscription_tier) 
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'ADSapp Test Organization', 
  'adsapp-test',
  'active',
  'professional'
);

-- 2. Maak een admin profiel aan (dit werkt alleen als je al een user hebt in auth.users)
-- Je moet eerst registreren via de app, dan kun je dit profiel updaten naar admin

-- Voorbeeld: Update een bestaand profiel naar admin role
-- UPDATE profiles 
-- SET 
--   organization_id = 'a0000000-0000-0000-0000-000000000001',
--   role = 'owner',
--   full_name = 'Admin User'
-- WHERE email = 'jouw-email@example.com';

-- 3. Maak wat test contacten aan
INSERT INTO contacts (organization_id, whatsapp_id, phone_number, name) VALUES
('a0000000-0000-0000-0000-000000000001', 'test_contact_1', '+31612345678', 'Test Contact 1'),
('a0000000-0000-0000-0000-000000000001', 'test_contact_2', '+31687654321', 'Test Contact 2');

-- 4. Maak test conversaties aan
INSERT INTO conversations (organization_id, contact_id, status, subject) VALUES
('a0000000-0000-0000-0000-000000000001', 
 (SELECT id FROM contacts WHERE whatsapp_id = 'test_contact_1' LIMIT 1), 
 'open', 
 'Test Conversation 1'),
('a0000000-0000-0000-0000-000000000001', 
 (SELECT id FROM contacts WHERE whatsapp_id = 'test_contact_2' LIMIT 1), 
 'pending', 
 'Test Conversation 2');

-- 5. Maak test berichten aan
INSERT INTO messages (conversation_id, sender_type, content, message_type) VALUES
((SELECT id FROM conversations WHERE subject = 'Test Conversation 1' LIMIT 1), 'contact', 'Hallo, ik heb een vraag over jullie product', 'text'),
((SELECT id FROM conversations WHERE subject = 'Test Conversation 1' LIMIT 1), 'agent', 'Hallo! Natuurlijk, waar kan ik je mee helpen?', 'text'),
((SELECT id FROM conversations WHERE subject = 'Test Conversation 2' LIMIT 1), 'contact', 'Kunnen jullie mij meer informatie geven?', 'text');

-- 6. Update conversation timestamps
UPDATE conversations SET 
  last_message_at = NOW(),
  updated_at = NOW();

-- 7. Update contact timestamps  
UPDATE contacts SET 
  last_message_at = NOW(),
  updated_at = NOW();
