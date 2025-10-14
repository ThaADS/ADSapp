#!/usr/bin/env node

/**
 * Check Database Schema and Create Simple User
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://egaiyydjgeqlhthxmvbn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE';

async function checkDatabase() {
  console.log('🔍 Checking Database Schema...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Check if tables exist
    console.log('📋 Checking tables...');

    // Try to query organizations table
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    if (orgError) {
      console.log('❌ Organizations table error:', orgError.message);
    } else {
      console.log('✅ Organizations table exists');
    }

    // Try to query profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (profileError) {
      console.log('❌ Profiles table error:', profileError.message);
    } else {
      console.log('✅ Profiles table exists');
    }

    // Try to create user with basic Supabase auth (no custom tables)
    console.log('👤 Attempting to create basic auth user...');

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'superadmin@adsapp.com',
      password: 'ADSapp2024!SuperSecure#Admin',
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✅ User already exists in auth.users!');

        // List users to confirm
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const superAdmin = usersList.users.find(u => u.email === 'superadmin@adsapp.com');

        if (superAdmin) {
          console.log('✅ Super admin found in database!');
          console.log('   ID:', superAdmin.id);
          console.log('   Email:', superAdmin.email);
          console.log('   Created:', superAdmin.created_at);

          console.log('');
          console.log('🎉 SUPER ADMIN READY FOR LOGIN!');
          console.log('   Email:    superadmin@adsapp.com');
          console.log('   Password: ADSapp2024!SuperSecure#Admin');
          console.log('   URL:      http://localhost:3001/auth/signin');
          console.log('');
          console.log('✅ Try logging in now!');
          return;
        }
      } else {
        console.log('❌ Auth user creation error:', authError.message);
      }
    } else {
      console.log('✅ New auth user created successfully!');
      console.log('   ID:', authUser.user.id);
      console.log('   Email:', authUser.user.email);

      console.log('');
      console.log('🎉 SUPER ADMIN CREATED!');
      console.log('   Email:    superadmin@adsapp.com');
      console.log('   Password: ADSapp2024!SuperSecure#Admin');
      console.log('   URL:      http://localhost:3001/auth/signin');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Database check error:', error.message);
  }
}

checkDatabase();