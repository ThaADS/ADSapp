import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Onboarding request received:', { ...body, whatsappBusinessAccountId: body.whatsappBusinessAccountId ? '[REDACTED]' : null })

    const {
      organizationName,
      subdomain,
      whatsappPhoneNumber,
      whatsappBusinessAccountId,
      fullName,
      role,
    } = body

    // Validate required fields
    if (!organizationName || !subdomain || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationName, subdomain, fullName, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['owner', 'admin', 'agent'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, admin, or agent' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'You must be authenticated to complete onboarding' },
        { status: 401 }
      )
    }

    console.log('Authenticated user:', user.id, user.email)

    // Check if user already has an organization
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('Profile check error:', profileCheckError)
      return NextResponse.json(
        { error: 'Failed to check existing profile' },
        { status: 500 }
      )
    }

    if (existingProfile?.organization_id) {
      return NextResponse.json(
        { error: 'You are already part of an organization' },
        { status: 400 }
      )
    }

    // Check if subdomain is already taken
    const { data: existingOrg, error: orgCheckError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', subdomain)
      .single()

    if (orgCheckError && orgCheckError.code !== 'PGRST116') {
      console.error('Organization check error:', orgCheckError)
      return NextResponse.json(
        { error: 'Failed to validate subdomain' },
        { status: 500 }
      )
    }

    if (existingOrg) {
      return NextResponse.json(
        { error: 'This subdomain is already taken. Please choose another one.' },
        { status: 400 }
      )
    }

    // Start transaction: Create organization and update profile
    console.log('Creating organization...')

    // Step 1: Create organization
    const { data: newOrganization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        slug: subdomain,
        whatsapp_phone_number_id: whatsappPhoneNumber || null,
        whatsapp_business_account_id: whatsappBusinessAccountId || null,
        subscription_status: 'trial',
        subscription_tier: 'starter',
      })
      .select()
      .single()

    if (orgError || !newOrganization) {
      console.error('Organization creation error:', orgError)
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    console.log('Organization created:', newOrganization.id)

    // Step 2: Update user profile
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: newOrganization.id,
        full_name: fullName,
        role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (profileError) {
      console.error('Profile update error:', profileError)

      // Rollback: Delete the created organization
      await supabase
        .from('organizations')
        .delete()
        .eq('id', newOrganization.id)

      return NextResponse.json(
        { error: `Failed to update profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    console.log('Profile updated successfully')

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        organization: {
          id: newOrganization.id,
          name: newOrganization.name,
          slug: newOrganization.slug,
        },
        profile: {
          id: updatedProfile.id,
          full_name: updatedProfile.full_name,
          role: updatedProfile.role,
        },
      },
    })
  } catch (error) {
    console.error('Onboarding API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during onboarding' },
      { status: 500 }
    )
  }
}