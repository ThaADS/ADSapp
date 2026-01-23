import { Resend } from 'resend'
import { TeamInvitation, UserRole } from '@/types/team'

// Initialize Resend (gracefully handles missing API key)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SendInvitationEmailParams {
  invitation: TeamInvitation
  organizationName: string
  inviterName: string
  inviterEmail: string
}

/**
 * Generate invitation email HTML
 */
function generateInvitationEmailHtml(params: SendInvitationEmailParams): string {
  const { invitation, organizationName, inviterName } = params
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`
  const expiresAt = new Date(invitation.expires_at)
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #2563eb;
      margin: 0;
      font-size: 28px;
    }
    h2 {
      color: #1f2937;
      margin-bottom: 20px;
    }
    .invitation-details {
      background-color: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 15px 20px;
      margin: 20px 0;
    }
    .invitation-details p {
      margin: 8px 0;
    }
    .invitation-details strong {
      color: #1f2937;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .expiry-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
    }
    .security-notice {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>ADSapp</h1>
    </div>

    <h2>You've been invited to join ${organizationName}</h2>

    <p>Hello!</p>

    <p><strong>${inviterName}</strong> has invited you to join their team on ADSapp, a WhatsApp Business Inbox platform.</p>

    <div class="invitation-details">
      <p><strong>Organization:</strong> ${organizationName}</p>
      <p><strong>Role:</strong> ${getRoleDisplayName(invitation.role)}</p>
      <p><strong>Invited by:</strong> ${inviterName}</p>
    </div>

    <p>Click the button below to accept this invitation and create your account:</p>

    <div style="text-align: center;">
      <a href="${acceptUrl}" class="cta-button">Accept Invitation</a>
    </div>

    <div class="expiry-notice">
      <strong>⏰ This invitation expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}</strong><br>
      Make sure to accept it before ${expiresAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}.
    </div>

    <div class="security-notice">
      <strong>🔒 Security Notice:</strong><br>
      This invitation link is unique to you and should not be shared. If you didn't expect this invitation or have concerns, please contact ${inviterEmail}.
    </div>

    <div class="footer">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${acceptUrl}">${acceptUrl}</a></p>

      <p>If you have any questions, please contact us at <a href="mailto:support@adsapp.com">support@adsapp.com</a></p>

      <p>&copy; ${new Date().getFullYear()} ADSapp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text version of invitation email
 */
function generateInvitationEmailText(params: SendInvitationEmailParams): string {
  const { invitation, organizationName, inviterName, inviterEmail } = params
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`
  const expiresAt = new Date(invitation.expires_at)
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return `
You've been invited to join ${organizationName} on ADSapp

Hello!

${inviterName} has invited you to join their team on ADSapp, a WhatsApp Business Inbox platform.

INVITATION DETAILS:
- Organization: ${organizationName}
- Role: ${getRoleDisplayName(invitation.role)}
- Invited by: ${inviterName}

Accept your invitation by visiting this link:
${acceptUrl}

IMPORTANT: This invitation expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''} (${expiresAt.toLocaleDateString()}).

SECURITY NOTICE:
This invitation link is unique to you and should not be shared. If you didn't expect this invitation or have concerns, please contact ${inviterEmail}.

If you have any questions, please contact us at support@adsapp.com

© ${new Date().getFullYear()} ADSapp. All rights reserved.
  `.trim()
}

/**
 * Get human-readable role name
 */
function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    agent: 'Agent',
    viewer: 'Viewer',
  }
  return roleNames[role]
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
  const { invitation, organizationName } = params

  // Skip email sending if Resend is not configured
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping invitation email to:', invitation.email)
    return
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ADSapp <noreply@adsapp.com>',
      to: invitation.email,
      subject: `You've been invited to join ${organizationName} on ADSapp`,
      html: generateInvitationEmailHtml(params),
      text: generateInvitationEmailText(params),
      tags: [
        { name: 'category', value: 'team-invitation' },
        { name: 'organization_id', value: invitation.organization_id },
      ],
    })

    if (error) {
      throw new Error(`Failed to send invitation email: ${error.message}`)
    }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    throw error
  }
}

/**
 * Send invitation reminder email (for invitations expiring soon)
 */
export async function sendInvitationReminderEmail(
  params: SendInvitationEmailParams
): Promise<void> {
  const { invitation, organizationName, inviterName } = params
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`

  // Skip email sending if Resend is not configured
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping reminder email to:', invitation.email)
    return
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ADSapp <noreply@adsapp.com>',
      to: invitation.email,
      subject: `Reminder: Your invitation to ${organizationName} expires soon`,
      html: `
        <h2>Reminder: Your invitation expires soon</h2>
        <p>This is a friendly reminder that your invitation to join ${organizationName} on ADSapp will expire soon.</p>
        <p><strong>${inviterName}</strong> is waiting for you to join the team!</p>
        <p><a href="${acceptUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
      `,
      text: `Reminder: Your invitation to join ${organizationName} expires soon.\n\nAccept your invitation: ${acceptUrl}`,
      tags: [
        { name: 'category', value: 'team-invitation-reminder' },
        { name: 'organization_id', value: invitation.organization_id },
      ],
    })

    if (error) {
      throw new Error(`Failed to send reminder email: ${error.message}`)
    }
  } catch (error) {
    console.error('Error sending reminder email:', error)
    throw error
  }
}
