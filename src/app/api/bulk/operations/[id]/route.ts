import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, getUserOrganization, createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { BulkOperationQueue } from '@/lib/bulk-operations/queue'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const { id } = await params;

    const queue = new BulkOperationQueue()
    const operation = await queue.getOperation(id, profile.organization_id)

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      )
    }

    return createSuccessResponse(operation)

  } catch (error) {
    console.error('Get bulk operation error:', error)
    return createErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const { id } = await params;

    const body = await request.json()
    const { action } = body

    if (action !== 'cancel') {
      return NextResponse.json(
        { error: 'Only cancel action is supported' },
        { status: 400 }
      )
    }

    const queue = new BulkOperationQueue()

    // Check if operation exists and belongs to organization
    const operation = await queue.getOperation(id, profile.organization_id)
    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      )
    }

    // Check if operation can be cancelled
    if (!['queued', 'processing'].includes(operation.status)) {
      return NextResponse.json(
        { error: 'Operation cannot be cancelled in current status' },
        { status: 400 }
      )
    }

    await queue.cancelOperation(id, profile.organization_id)

    return createSuccessResponse({
      id: id,
      status: 'cancelled',
      message: 'Operation cancelled successfully'
    })

  } catch (error) {
    console.error('Cancel bulk operation error:', error)
    return createErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const { id } = await params;

    // Check if user has admin privileges
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Insufficient privileges' },
        { status: 403 }
      )
    }

    const queue = new BulkOperationQueue()

    // Check if operation exists and belongs to organization
    const operation = await queue.getOperation(id, profile.organization_id)
    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of completed/failed/cancelled operations
    if (!['completed', 'failed', 'cancelled'].includes(operation.status)) {
      return NextResponse.json(
        { error: 'Cannot delete active operation' },
        { status: 400 }
      )
    }

    // Delete the operation record
    const supabase = await createClient()
    const { error } = await supabase
      .from('bulk_operations')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      throw error
    }

    return createSuccessResponse({
      id: id,
      message: 'Operation deleted successfully'
    })

  } catch (error) {
    console.error('Delete bulk operation error:', error)
    return createErrorResponse(error)
  }
}