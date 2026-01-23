import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

export const dynamic = 'force-dynamic'

/**
 * POST /api/organizations/logo
 * Upload organization logo
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only owner/admin can upload logo
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only owner/admin can upload logo' },
        { status: 403 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, SVG' },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size: 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.organization_id}/logo.${fileExt}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)

    // Sanitize SVG files to prevent XSS attacks
    if (file.type === 'image/svg+xml') {
      try {
        // Convert buffer to string for SVG content
        const svgContent = buffer.toString('utf-8')

        // Create JSDOM window for server-side DOMPurify
        const window = new JSDOM('').window
        const purify = DOMPurify(window as unknown as Window)

        // Sanitize SVG with DOMPurify
        const cleanSVG = purify.sanitize(svgContent, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['use', 'defs', 'pattern', 'mask', 'clipPath'], // Allow common SVG tags
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'], // Block dangerous tags
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'], // Block event handlers
          ALLOW_DATA_ATTR: false, // Block data attributes
        })

        // Convert sanitized SVG back to buffer
        buffer = Buffer.from(cleanSVG, 'utf-8')

        console.log('SVG sanitized successfully')
      } catch (sanitizeError) {
        console.error('SVG sanitization error:', sanitizeError)
        return NextResponse.json({ error: 'Failed to sanitize SVG file' }, { status: 500 })
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // Replace existing logo
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('organization-logos').getPublicUrl(fileName)

    // Update organization with logo URL
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: publicUrl })
      .eq('id', profile.organization_id)

    if (updateError) {
      console.error('Error updating organization:', updateError)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    // Log to audit trail (trigger will handle this automatically)

    return NextResponse.json({
      success: true,
      logo_url: publicUrl,
    })
  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/organizations/logo
 * Delete organization logo
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only owner/admin can delete logo
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only owner/admin can delete logo' },
        { status: 403 }
      )
    }

    // Get current logo URL to extract path
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', profile.organization_id)
      .single()

    if (orgError || !org || !org.logo_url) {
      return NextResponse.json({ error: 'No logo to delete' }, { status: 404 })
    }

    // Extract file path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/organization-logos/{org_id}/logo.ext
    const urlParts = org.logo_url.split('/organization-logos/')
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Invalid logo URL' }, { status: 400 })
    }

    const filePath = urlParts[1]

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('organization-logos')
      .remove([filePath])

    if (deleteError) {
      console.error('Storage delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete logo from storage' }, { status: 500 })
    }

    // Update organization (remove logo URL)
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: null })
      .eq('id', profile.organization_id)

    if (updateError) {
      console.error('Error updating organization:', updateError)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Logo deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting logo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
