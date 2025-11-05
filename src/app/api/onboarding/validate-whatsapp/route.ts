import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/onboarding/validate-whatsapp
 * Validate WhatsApp Business API credentials in real-time during onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumberId, businessAccountId, accessToken } = body;

    // Validate Phone Number ID format
    if (phoneNumberId) {
      // Phone Number ID should be numeric and 15 digits
      const phoneNumberIdValid = /^\d{15}$/.test(phoneNumberId);

      if (!phoneNumberIdValid) {
        return NextResponse.json({
          valid: false,
          field: 'phoneNumberId',
          error: 'Phone Number ID must be exactly 15 digits',
        });
      }

      // If access token provided, test actual API call
      if (accessToken) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
              valid: true,
              field: 'phoneNumberId',
              data: {
                verified_name: data.verified_name,
                display_phone_number: data.display_phone_number,
              },
            });
          } else {
            return NextResponse.json({
              valid: false,
              field: 'phoneNumberId',
              error: 'Phone Number ID not found or access denied',
            });
          }
        } catch (apiError) {
          console.error('WhatsApp API validation error:', apiError);
          // Continue with format validation if API call fails
        }
      }

      // Format is valid even if we couldn't test API
      return NextResponse.json({
        valid: true,
        field: 'phoneNumberId',
        message: 'Format is valid. Full validation will occur on completion.',
      });
    }

    // Validate Business Account ID format
    if (businessAccountId) {
      const businessAccountIdValid = /^\d{15,20}$/.test(businessAccountId);

      return NextResponse.json({
        valid: businessAccountIdValid,
        field: 'businessAccountId',
        error: businessAccountIdValid
          ? undefined
          : 'Business Account ID must be 15-20 digits',
      });
    }

    // Validate Access Token format
    if (accessToken) {
      // Access tokens start with EAA and are typically 200+ characters
      const accessTokenValid =
        accessToken.startsWith('EAA') && accessToken.length > 100;

      return NextResponse.json({
        valid: accessTokenValid,
        field: 'accessToken',
        error: accessTokenValid
          ? undefined
          : 'Access Token appears invalid. Should start with "EAA" and be 100+ characters',
      });
    }

    return NextResponse.json(
      { error: 'No validation field provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
