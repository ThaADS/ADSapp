/**
 * SAML 2.0 Authentication Handler
 * Implements Service Provider (SP) functionality for SAML-based SSO
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createClient } from '@/lib/supabase/server';
import {
  SAMLConfig,
  SAMLAssertion,
  SSOConfiguration,
  SSOError,
  SPMetadata,
} from './types';
import { SignedXml } from 'xml-crypto';
import { parseString } from 'xml2js';
import * as crypto from 'crypto';

export class SAMLHandler {
  private config: SSOConfiguration;
  private samlConfig: SAMLConfig;

  constructor(config: SSOConfiguration) {
    this.config = config;
    this.samlConfig = {
      entityId: config.saml_entity_id!,
      ssoUrl: config.saml_sso_url!,
      sloUrl: config.saml_slo_url || undefined,
      certificate: config.saml_certificate!,
      signRequests: config.saml_sign_requests || false,
      wantAssertionsSigned: config.saml_want_assertions_signed ?? true,
      nameIdFormat:
        config.saml_name_id_format ||
        'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };
  }

  /**
   * Generate SAML Authentication Request (SP-initiated flow)
   */
  async generateAuthRequest(
    relayState?: string,
    forceAuthn: boolean = false
  ): Promise<{ url: string; requestId: string }> {
    const requestId = this.generateRequestId();
    const issueInstant = new Date().toISOString();
    const assertionConsumerServiceUrl = this.getAssertionConsumerServiceUrl();

    const authRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${requestId}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${this.samlConfig.ssoUrl}"
                    ForceAuthn="${forceAuthn}"
                    AssertionConsumerServiceURL="${assertionConsumerServiceUrl}">
  <saml:Issuer>${this.samlConfig.entityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="${this.samlConfig.nameIdFormat}" AllowCreate="true"/>
</samlp:AuthnRequest>`;

    // Sign request if configured
    const signedRequest = this.samlConfig.signRequests
      ? await this.signRequest(authRequest)
      : authRequest;

    // Deflate and Base64 encode
    const encodedRequest = this.encodeRequest(signedRequest);

    // Build redirect URL
    const url = this.buildRedirectUrl(
      this.samlConfig.ssoUrl,
      encodedRequest,
      relayState
    );

    // Store request for validation
    await this.storeRequest(requestId, assertionConsumerServiceUrl, relayState);

    return { url, requestId };
  }

  /**
   * Process SAML Response (Assertion Consumer Service)
   */
  async processResponse(
    samlResponse: string,
    relayState?: string
  ): Promise<SAMLAssertion> {
    try {
      // Decode response
      const decodedResponse = this.decodeResponse(samlResponse);

      // Parse XML
      const parsedResponse = await this.parseXML(decodedResponse);

      // Verify signature if required
      if (this.samlConfig.wantAssertionsSigned) {
        await this.verifySignature(decodedResponse);
      }

      // Extract assertion
      const assertion = await this.extractAssertion(parsedResponse);

      // Validate assertion
      await this.validateAssertion(assertion);

      return assertion;
    } catch (error) {
      throw this.createSSOError(
        'INVALID_ASSERTION',
        'Failed to process SAML response',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Generate SAML Logout Request
   */
  async generateLogoutRequest(
    nameId: string,
    sessionIndex?: string
  ): Promise<{ url: string; requestId: string }> {
    if (!this.samlConfig.sloUrl) {
      throw this.createSSOError(
        'CONFIG_NOT_FOUND',
        'Single Logout URL not configured'
      );
    }

    const requestId = this.generateRequestId();
    const issueInstant = new Date().toISOString();

    const logoutRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                     xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                     ID="${requestId}"
                     Version="2.0"
                     IssueInstant="${issueInstant}"
                     Destination="${this.samlConfig.sloUrl}">
  <saml:Issuer>${this.samlConfig.entityId}</saml:Issuer>
  <saml:NameID Format="${this.samlConfig.nameIdFormat}">${this.escapeXml(nameId)}</saml:NameID>
  ${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ''}
</samlp:LogoutRequest>`;

    const signedRequest = await this.signRequest(logoutRequest);
    const encodedRequest = this.encodeRequest(signedRequest);
    const url = this.buildRedirectUrl(this.samlConfig.sloUrl, encodedRequest);

    return { url, requestId };
  }

  /**
   * Generate SP Metadata for IdP configuration
   */
  generateMetadata(): string {
    const assertionConsumerServiceUrl = this.getAssertionConsumerServiceUrl();
    const singleLogoutServiceUrl = this.getSingleLogoutServiceUrl();

    let metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${this.samlConfig.entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
                      WantAssertionsSigned="${this.samlConfig.wantAssertionsSigned}">
    <md:NameIDFormat>${this.samlConfig.nameIdFormat}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${assertionConsumerServiceUrl}"
                                 index="1"/>`;

    if (singleLogoutServiceUrl) {
      metadata += `
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="${singleLogoutServiceUrl}"/>`;
    }

    metadata += `
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

    return metadata;
  }

  // Private helper methods

  private generateRequestId(): string {
    return '_' + crypto.randomBytes(16).toString('hex');
  }

  private getAssertionConsumerServiceUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/auth/sso/saml/acs`;
  }

  private getSingleLogoutServiceUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/auth/sso/saml/slo`;
  }

  private async signRequest(request: string): Promise<string> {
    // Implementation would use xml-crypto for signing
    // For now, return unsigned request
    // In production, implement proper XML signing
    return request;
  }

  private encodeRequest(request: string): string {
    const deflated = require('zlib').deflateRawSync(Buffer.from(request));
    return Buffer.from(deflated).toString('base64');
  }

  private decodeResponse(response: string): string {
    return Buffer.from(response, 'base64').toString('utf8');
  }

  private buildRedirectUrl(
    destination: string,
    request: string,
    relayState?: string
  ): string {
    const params = new URLSearchParams();
    params.append('SAMLRequest', request);
    if (relayState) {
      params.append('RelayState', relayState);
    }
    return `${destination}?${params.toString()}`;
  }

  private async parseXML(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  private async verifySignature(xml: string): Promise<void> {
    try {
      const cert = this.formatCertificate(this.samlConfig.certificate);
      const sig = new SignedXml();

      // Set certificate
      sig.keyInfoProvider = {
        getKeyInfo: () => '',
        getKey: () => Buffer.from(cert),
      };

      // Load XML
      sig.loadSignature(xml);

      // Verify
      const isValid = sig.checkSignature(xml);

      if (!isValid) {
        throw new Error('Invalid signature');
      }
    } catch (error) {
      throw this.createSSOError(
        'SIGNATURE_VERIFICATION_FAILED',
        'SAML signature verification failed',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private formatCertificate(cert: string): string {
    // Remove PEM headers and format
    let formatted = cert.replace(/-----BEGIN CERTIFICATE-----/, '');
    formatted = formatted.replace(/-----END CERTIFICATE-----/, '');
    formatted = formatted.replace(/\s/g, '');
    return `-----BEGIN CERTIFICATE-----\n${formatted}\n-----END CERTIFICATE-----`;
  }

  private async extractAssertion(parsedResponse: any): Promise<SAMLAssertion> {
    try {
      const response = parsedResponse['samlp:Response'] || parsedResponse.Response;
      const assertion = response?.Assertion || response?.['saml:Assertion'];

      if (!assertion) {
        throw new Error('No assertion found in response');
      }

      const subject = assertion.Subject || assertion['saml:Subject'];
      const nameId = subject?.NameID || subject?.['saml:NameID'];
      const conditions = assertion.Conditions || assertion['saml:Conditions'];
      const attributeStatement =
        assertion.AttributeStatement || assertion['saml:AttributeStatement'];

      // Extract attributes
      const attributes: Record<string, string | string[]> = {};
      if (attributeStatement) {
        const attrs = Array.isArray(attributeStatement.Attribute)
          ? attributeStatement.Attribute
          : [attributeStatement.Attribute];

        attrs.forEach((attr: any) => {
          const name = attr.$.Name || attr.Name;
          const values = Array.isArray(attr.AttributeValue)
            ? attr.AttributeValue
            : [attr.AttributeValue];
          attributes[name] = values.map((v: any) => v._ || v);
        });
      }

      return {
        nameId: typeof nameId === 'string' ? nameId : nameId._,
        nameIdFormat: nameId.$?.Format || this.samlConfig.nameIdFormat,
        sessionIndex: response.$.ID || response.ID,
        attributes,
        issuer: assertion.Issuer?._|| assertion.Issuer || '',
        audience: conditions?.AudienceRestriction?.Audience,
        notBefore: conditions?.$.NotBefore
          ? new Date(conditions.$.NotBefore)
          : undefined,
        notOnOrAfter: conditions?.$.NotOnOrAfter
          ? new Date(conditions.$.NotOnOrAfter)
          : undefined,
        inResponseTo: response.$.InResponseTo,
      };
    } catch (error) {
      throw this.createSSOError(
        'INVALID_ASSERTION',
        'Failed to extract assertion from SAML response',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async validateAssertion(assertion: SAMLAssertion): Promise<void> {
    const now = new Date();

    // Validate time bounds
    if (assertion.notBefore && now < assertion.notBefore) {
      throw this.createSSOError(
        'INVALID_ASSERTION',
        'Assertion not yet valid',
        { notBefore: assertion.notBefore.toISOString() }
      );
    }

    if (assertion.notOnOrAfter && now >= assertion.notOnOrAfter) {
      throw this.createSSOError(
        'INVALID_ASSERTION',
        'Assertion has expired',
        { notOnOrAfter: assertion.notOnOrAfter.toISOString() }
      );
    }

    // Validate audience
    if (
      assertion.audience &&
      assertion.audience !== this.samlConfig.entityId
    ) {
      throw this.createSSOError('INVALID_ASSERTION', 'Invalid audience', {
        expected: this.samlConfig.entityId,
        received: assertion.audience,
      });
    }
  }

  private async storeRequest(
    requestId: string,
    acsUrl: string,
    relayState?: string
  ): Promise<void> {
    const supabase = await createClient();
    const nonce = crypto.randomBytes(32).toString('hex');

    await supabase.from('sso_saml_requests').insert({
      request_id: requestId,
      relay_state: relayState,
      sso_config_id: this.config.id,
      assertion_consumer_service_url: acsUrl,
      nonce,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private createSSOError(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): SSOError {
    return {
      code: code as any,
      message,
      details,
    };
  }
}

/**
 * Initialize SAML handler from configuration
 */
export async function createSAMLHandler(
  configId: string
): Promise<SAMLHandler> {
  const supabase = await createClient();

  const { data: config, error } = await supabase
    .from('sso_configurations')
    .select('*')
    .eq('id', configId)
    .eq('provider_type', 'saml')
    .single();

  if (error || !config) {
    throw new Error('SAML configuration not found');
  }

  if (!config.enabled) {
    throw new Error('SAML configuration is disabled');
  }

  return new SAMLHandler(config);
}
