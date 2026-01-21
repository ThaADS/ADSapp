export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Common API types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> {
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at: string | null
          id: string
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code: string
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string
          code_challenge_method?: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id?: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          last_webauthn_challenge_data: Json | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorizations: {
        Row: {
          approved_at: string | null
          authorization_code: string | null
          authorization_id: string
          client_id: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string
          expires_at: string
          id: string
          nonce: string | null
          redirect_uri: string
          resource: string | null
          response_type: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state: string | null
          status: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id: string
          client_id: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id: string
          nonce?: string | null
          redirect_uri: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id?: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string | null
          redirect_uri?: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope?: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_client_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Insert: {
          code_verifier?: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          id?: string
          provider_type?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_name: string | null
          client_secret_hash: string | null
          client_type: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri: string | null
          created_at: string
          deleted_at: string | null
          grant_types: string
          id: string
          logo_uri: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types: string
          id: string
          logo_uri?: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types?: string
          id?: string
          logo_uri?: string | null
          redirect_uris?: string
          registration_type?: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at?: string
        }
        Relationships: []
      }
      oauth_consents: {
        Row: {
          client_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          scopes: string
          user_id: string
        }
        Insert: {
          client_id: string
          granted_at?: string
          id: string
          revoked_at?: string | null
          scopes: string
          user_id: string
        }
        Update: {
          client_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_tokens: {
        Row: {
          created_at: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            isOneToOne: false
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown
          not_after: string | null
          oauth_client_id: string | null
          refresh_token_counter: number | null
          refresh_token_hmac_key: string | null
          refreshed_at: string | null
          scopes: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_oauth_client_id_fkey"
            columns: ["oauth_client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          disabled: boolean | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: { Args: never; Returns: string }
      jwt: { Args: never; Returns: Json }
      role: { Args: never; Returns: string }
      uid: { Args: never; Returns: string }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone"
      oauth_authorization_status: "pending" | "approved" | "denied" | "expired"
      oauth_client_type: "public" | "confidential"
      oauth_registration_type: "dynamic" | "manual"
      oauth_response_type: "code"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_capacity: {
        Row: {
          agent_id: string
          auto_assign_enabled: boolean
          avg_response_time_seconds: number | null
          created_at: string
          current_active_conversations: number
          customer_satisfaction_score: number | null
          id: string
          languages: string[] | null
          max_concurrent_conversations: number
          organization_id: string
          skills: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          auto_assign_enabled?: boolean
          avg_response_time_seconds?: number | null
          created_at?: string
          current_active_conversations?: number
          customer_satisfaction_score?: number | null
          id?: string
          languages?: string[] | null
          max_concurrent_conversations?: number
          organization_id: string
          skills?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          auto_assign_enabled?: boolean
          avg_response_time_seconds?: number | null
          created_at?: string
          current_active_conversations?: number
          customer_satisfaction_score?: number | null
          id?: string
          languages?: string[] | null
          max_concurrent_conversations?: number
          organization_id?: string
          skills?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_capacity_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_capacity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_metrics: {
        Row: {
          agent_id: string
          avg_first_response_time: unknown
          avg_resolution_time: unknown
          avg_response_time: unknown
          conversations_handled: number | null
          conversations_resolved: number | null
          conversations_transferred: number | null
          created_at: string | null
          customer_satisfaction_score: number | null
          date: string
          id: string
          messages_sent: number | null
          online_time: unknown
          organization_id: string
          templates_used: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          avg_first_response_time?: unknown
          avg_resolution_time?: unknown
          avg_response_time?: unknown
          conversations_handled?: number | null
          conversations_resolved?: number | null
          conversations_transferred?: number | null
          created_at?: string | null
          customer_satisfaction_score?: number | null
          date: string
          id?: string
          messages_sent?: number | null
          online_time?: unknown
          organization_id: string
          templates_used?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          avg_first_response_time?: unknown
          avg_resolution_time?: unknown
          avg_response_time?: unknown
          conversations_handled?: number | null
          conversations_resolved?: number | null
          conversations_transferred?: number | null
          created_at?: string | null
          customer_satisfaction_score?: number | null
          date?: string
          id?: string
          messages_sent?: number | null
          online_time?: unknown
          organization_id?: string
          templates_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_performance_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          skill_level: number | null
          skill_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          skill_level?: number | null
          skill_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          skill_level?: number | null
          skill_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_responses: {
        Row: {
          completion_tokens: number
          confidence_score: number | null
          conversation_id: string | null
          cost_usd: number
          created_at: string | null
          feature: string
          id: string
          latency_ms: number
          model_used: string
          organization_id: string
          prompt_tokens: number
          response_data: Json
          total_tokens: number
          user_feedback: string | null
        }
        Insert: {
          completion_tokens: number
          confidence_score?: number | null
          conversation_id?: string | null
          cost_usd: number
          created_at?: string | null
          feature: string
          id?: string
          latency_ms: number
          model_used: string
          organization_id: string
          prompt_tokens: number
          response_data: Json
          total_tokens: number
          user_feedback?: string | null
        }
        Update: {
          completion_tokens?: number
          confidence_score?: number | null
          conversation_id?: string | null
          cost_usd?: number
          created_at?: string | null
          feature?: string
          id?: string
          latency_ms?: number
          model_used?: string
          organization_id?: string
          prompt_tokens?: number
          response_data?: Json
          total_tokens?: number
          user_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          alert_threshold: number | null
          auto_response_conditions: Json | null
          created_at: string | null
          default_model: string | null
          enabled: boolean | null
          fallback_model: string | null
          features_enabled: Json | null
          id: string
          max_tokens: number | null
          monthly_budget_usd: number | null
          organization_id: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          alert_threshold?: number | null
          auto_response_conditions?: Json | null
          created_at?: string | null
          default_model?: string | null
          enabled?: boolean | null
          fallback_model?: string | null
          features_enabled?: Json | null
          id?: string
          max_tokens?: number | null
          monthly_budget_usd?: number | null
          organization_id: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_threshold?: number | null
          auto_response_conditions?: Json | null
          created_at?: string | null
          default_model?: string | null
          enabled?: boolean | null
          fallback_model?: string | null
          features_enabled?: Json | null
          id?: string
          max_tokens?: number | null
          monthly_budget_usd?: number | null
          organization_id?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          trigger_conditions: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          trigger_conditions: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          trigger_conditions?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          message: Json | null
          name: string
          organization_id: string
          rate_limiting: Json
          scheduling: Json
          started_at: string | null
          statistics: Json | null
          status: string
          target_audience: Json
          template_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          message?: Json | null
          name: string
          organization_id: string
          rate_limiting?: Json
          scheduling: Json
          started_at?: string | null
          statistics?: Json | null
          status?: string
          target_audience: Json
          template_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          message?: Json | null
          name?: string
          organization_id?: string
          rate_limiting?: Json
          scheduling?: Json
          started_at?: string | null
          statistics?: Json | null
          status?: string
          target_audience?: Json
          template_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_message_jobs: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string | null
          delivered_at: string | null
          error: string | null
          id: string
          max_retries: number | null
          message_id: string | null
          read_at: string | null
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string | null
          whatsapp_id: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          max_retries?: number | null
          message_id?: string | null
          read_at?: string | null
          retry_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          whatsapp_id: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          max_retries?: number | null
          message_id?: string | null
          read_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          whatsapp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_message_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_message_jobs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_invalidation_logs: {
        Row: {
          cache_key: string
          created_at: string | null
          id: string
          invalidated_by: string | null
          reason: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          id?: string
          invalidated_by?: string | null
          reason?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          id?: string
          invalidated_by?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cache_invalidation_logs_invalidated_by_fkey"
            columns: ["invalidated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_metadata: {
        Row: {
          cache_key: string
          cache_level: string
          created_at: string | null
          hit_count: number | null
          id: string
          last_accessed_at: string | null
          miss_count: number | null
        }
        Insert: {
          cache_key: string
          cache_level: string
          created_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          miss_count?: number | null
        }
        Update: {
          cache_key?: string
          cache_level?: string
          created_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          miss_count?: number | null
        }
        Relationships: []
      }
      cache_stats_daily: {
        Row: {
          created_at: string | null
          date: string
          hit_rate: number | null
          id: string
          total_hits: number | null
          total_misses: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          hit_rate?: number | null
          id?: string
          total_hits?: number | null
          total_misses?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          hit_rate?: number | null
          id?: string
          total_hits?: number | null
          total_misses?: number | null
        }
        Relationships: []
      }
      campaign_analytics: {
        Row: {
          campaign_id: string | null
          campaign_type: string
          created_at: string | null
          date: string
          delivery_rate: number | null
          id: string
          messages_delivered: number | null
          messages_failed: number | null
          messages_read: number | null
          messages_sent: number | null
          open_rate: number | null
          opt_outs: number | null
          organization_id: string
          replies_received: number | null
          reply_rate: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_type: string
          created_at?: string | null
          date: string
          delivery_rate?: number | null
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          messages_sent?: number | null
          open_rate?: number | null
          opt_outs?: number | null
          organization_id: string
          replies_received?: number | null
          reply_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_type?: string
          created_at?: string | null
          date?: string
          delivery_rate?: number | null
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          messages_sent?: number | null
          open_rate?: number | null
          opt_outs?: number | null
          organization_id?: string
          replies_received?: number | null
          reply_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_sources: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          organization_id: string
          source_identifier: string | null
          source_metadata: Json | null
          source_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          source_identifier?: string | null
          source_metadata?: Json | null
          source_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          source_identifier?: string | null
          source_metadata?: Json | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_sources_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          contact_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json | null
          id: string
          name: string
          organization_id: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          contact_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          name: string
          organization_id: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          contact_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          name?: string
          organization_id?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_segment_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          contact_id: string
          segment_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          contact_id: string
          segment_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          contact_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_segment_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "contact_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_segments: {
        Row: {
          contact_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          last_calculated_at: string | null
          name: string
          organization_id: string
          rules: Json
          segment_type: string | null
          updated_at: string | null
        }
        Insert: {
          contact_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_calculated_at?: string | null
          name: string
          organization_id: string
          rules: Json
          segment_type?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_calculated_at?: string | null
          name?: string
          organization_id?: string
          rules?: Json
          segment_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          contact_id: string
          id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          contact_id: string
          id?: string
          tag_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          contact_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          customer_lifetime_value: number | null
          deleted_at: string | null
          engagement_score: number | null
          enrichment_data: Json | null
          id: string
          is_blocked: boolean | null
          last_engagement_at: string | null
          last_message_at: string | null
          lead_score: number | null
          name: string | null
          notes: string | null
          organization_id: string
          phone_number: string
          profile_picture_url: string | null
          tags: string[] | null
          updated_at: string | null
          whatsapp_id: string
        }
        Insert: {
          created_at?: string | null
          customer_lifetime_value?: number | null
          deleted_at?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          id?: string
          is_blocked?: boolean | null
          last_engagement_at?: string | null
          last_message_at?: string | null
          lead_score?: number | null
          name?: string | null
          notes?: string | null
          organization_id: string
          phone_number: string
          profile_picture_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp_id: string
        }
        Update: {
          created_at?: string | null
          customer_lifetime_value?: number | null
          deleted_at?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          id?: string
          is_blocked?: boolean | null
          last_engagement_at?: string | null
          last_message_at?: string | null
          lead_score?: number | null
          name?: string | null
          notes?: string | null
          organization_id?: string
          phone_number?: string
          profile_picture_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_ai_metadata: {
        Row: {
          auto_response_count: number | null
          conversation_id: string
          key_points: string[] | null
          last_analyzed_at: string | null
          last_auto_response_at: string | null
          next_steps: string[] | null
          organization_id: string
          sentiment: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          summary: string | null
          topics: string[] | null
          updated_at: string | null
          urgency_level: string | null
        }
        Insert: {
          auto_response_count?: number | null
          conversation_id: string
          key_points?: string[] | null
          last_analyzed_at?: string | null
          last_auto_response_at?: string | null
          next_steps?: string[] | null
          organization_id: string
          sentiment?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          summary?: string | null
          topics?: string[] | null
          updated_at?: string | null
          urgency_level?: string | null
        }
        Update: {
          auto_response_count?: number | null
          conversation_id?: string
          key_points?: string[] | null
          last_analyzed_at?: string | null
          last_auto_response_at?: string | null
          next_steps?: string[] | null
          organization_id?: string
          sentiment?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          summary?: string | null
          topics?: string[] | null
          updated_at?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_ai_metadata_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_ai_metadata_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_metrics: {
        Row: {
          agent_id: string | null
          avg_resolution_time: unknown
          avg_response_time: unknown
          created_at: string | null
          date: string
          id: string
          new_conversations: number | null
          organization_id: string
          resolved_conversations: number | null
          total_conversations: number | null
        }
        Insert: {
          agent_id?: string | null
          avg_resolution_time?: unknown
          avg_response_time?: unknown
          created_at?: string | null
          date: string
          id?: string
          new_conversations?: number | null
          organization_id: string
          resolved_conversations?: number | null
          total_conversations?: number | null
        }
        Update: {
          agent_id?: string | null
          avg_resolution_time?: unknown
          avg_response_time?: unknown
          created_at?: string | null
          date?: string
          id?: string
          new_conversations?: number | null
          organization_id?: string
          resolved_conversations?: number | null
          total_conversations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_queue: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          assignment_method: string | null
          conversation_id: string
          created_at: string
          id: string
          organization_id: string
          preferred_agent_id: string | null
          priority: number
          queued_at: string
          required_language: string | null
          required_skills: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_method?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          organization_id: string
          preferred_agent_id?: string | null
          priority?: number
          queued_at?: string
          required_language?: string | null
          required_skills?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_method?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          preferred_agent_id?: string | null
          priority?: number
          queued_at?: string
          required_language?: string | null
          required_skills?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_queue_preferred_agent_id_fkey"
            columns: ["preferred_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: string | null
          channel_metadata: Json | null
          contact_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          last_message_at: string | null
          organization_id: string
          priority: string | null
          status: string | null
          subject: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel?: string | null
          channel_metadata?: Json | null
          contact_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          organization_id: string
          priority?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string | null
          channel_metadata?: Json | null
          contact_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          organization_id?: string
          priority?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_connections: {
        Row: {
          created_at: string
          created_by: string | null
          credentials: Json
          crm_type: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          settings: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credentials?: Json
          crm_type: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          settings?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credentials?: Json
          crm_type?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          settings?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_field_mappings: {
        Row: {
          adsapp_field: string
          connection_id: string
          created_at: string
          crm_field: string
          direction: string
          id: string
          is_custom: boolean | null
          transform_rule: Json | null
          updated_at: string
        }
        Insert: {
          adsapp_field: string
          connection_id: string
          created_at?: string
          crm_field: string
          direction: string
          id?: string
          is_custom?: boolean | null
          transform_rule?: Json | null
          updated_at?: string
        }
        Update: {
          adsapp_field?: string
          connection_id?: string
          created_at?: string
          crm_field?: string
          direction?: string
          id?: string
          is_custom?: boolean | null
          transform_rule?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_field_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          direction: string
          duration_ms: number | null
          errors: Json | null
          id: string
          records_failed: number | null
          records_processed: number | null
          records_success: number | null
          started_at: string
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          direction: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          records_success?: number | null
          started_at?: string
          status?: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          direction?: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          records_success?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_state: {
        Row: {
          adsapp_updated_at: string | null
          conflict_details: Json | null
          conflict_detected: boolean | null
          connection_id: string
          contact_id: string | null
          created_at: string
          crm_record_id: string
          crm_record_type: string
          crm_updated_at: string | null
          id: string
          last_synced_at: string
          sync_direction: string | null
          updated_at: string
        }
        Insert: {
          adsapp_updated_at?: string | null
          conflict_details?: Json | null
          conflict_detected?: boolean | null
          connection_id: string
          contact_id?: string | null
          created_at?: string
          crm_record_id: string
          crm_record_type: string
          crm_updated_at?: string | null
          id?: string
          last_synced_at?: string
          sync_direction?: string | null
          updated_at?: string
        }
        Update: {
          adsapp_updated_at?: string | null
          conflict_details?: Json | null
          conflict_detected?: boolean | null
          connection_id?: string
          contact_id?: string | null
          created_at?: string
          crm_record_id?: string
          crm_record_type?: string
          crm_updated_at?: string | null
          id?: string
          last_synced_at?: string
          sync_direction?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_state_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_state_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhooks: {
        Row: {
          connection_id: string
          created_at: string
          event_type: string
          id: string
          last_triggered_at: string | null
          secret: string | null
          status: string
          webhook_id: string | null
          webhook_url: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          event_type: string
          id?: string
          last_triggered_at?: string | null
          secret?: string | null
          status?: string
          webhook_id?: string | null
          webhook_url: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          event_type?: string
          id?: string
          last_triggered_at?: string | null
          secret?: string | null
          status?: string
          webhook_id?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhooks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          created_at: string | null
          data_type: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          retention_days: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_type: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          retention_days: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          retention_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      default_retention_policies: {
        Row: {
          created_at: string | null
          data_type: string
          description: string | null
          id: string
          retention_days: number
        }
        Insert: {
          created_at?: string | null
          data_type: string
          description?: string | null
          id?: string
          retention_days: number
        }
        Update: {
          created_at?: string | null
          data_type?: string
          description?: string | null
          id?: string
          retention_days?: number
        }
        Relationships: []
      }
      deletion_audit_log: {
        Row: {
          deleted_at: string | null
          deletion_request_id: string | null
          id: string
          records_deleted: number
          table_name: string
        }
        Insert: {
          deleted_at?: string | null
          deletion_request_id?: string | null
          id?: string
          records_deleted: number
          table_name: string
        }
        Update: {
          deleted_at?: string | null
          deletion_request_id?: string | null
          id?: string
          records_deleted?: number
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_audit_log_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "deletion_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          data_type: string
          error_message: string | null
          id: string
          organization_id: string | null
          requested_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          data_type: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          requested_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          data_type?: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          requested_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_campaign_steps: {
        Row: {
          campaign_id: string
          conditions: Json | null
          created_at: string | null
          delay_type: string
          delay_value: number
          id: string
          media_url: string | null
          message_content: string | null
          message_type: string
          name: string
          settings: Json | null
          step_order: number
          template_id: string | null
          template_variables: Json | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          conditions?: Json | null
          created_at?: string | null
          delay_type: string
          delay_value: number
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_type: string
          name: string
          settings?: Json | null
          step_order: number
          template_id?: string | null
          template_variables?: Json | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          conditions?: Json | null
          created_at?: string | null
          delay_type?: string
          delay_value?: number
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_type?: string
          name?: string
          settings?: Json | null
          step_order?: number
          template_id?: string | null
          template_variables?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "drip_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_campaign_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          settings: Json | null
          statistics: Json | null
          status: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          settings?: Json | null
          statistics?: Json | null
          status?: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          settings?: Json | null
          statistics?: Json | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_enrollments: {
        Row: {
          campaign_id: string
          completed_at: string | null
          contact_id: string
          created_at: string | null
          current_step_id: string | null
          current_step_order: number | null
          dropped_reason: string | null
          enrolled_at: string | null
          enrolled_by: string | null
          id: string
          messages_delivered: number | null
          messages_read: number | null
          messages_sent: number | null
          next_message_at: string | null
          replied: boolean | null
          status: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          current_step_id?: string | null
          current_step_order?: number | null
          dropped_reason?: string | null
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
          messages_delivered?: number | null
          messages_read?: number | null
          messages_sent?: number | null
          next_message_at?: string | null
          replied?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          current_step_id?: string | null
          current_step_order?: number | null
          dropped_reason?: string | null
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
          messages_delivered?: number | null
          messages_read?: number | null
          messages_sent?: number | null
          next_message_at?: string | null
          replied?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "drip_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "drip_campaign_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_message_logs: {
        Row: {
          contact_id: string
          created_at: string | null
          delivered_at: string | null
          enrollment_id: string
          error: string | null
          id: string
          read_at: string | null
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string
          step_id: string
          updated_at: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          delivered_at?: string | null
          enrollment_id: string
          error?: string | null
          id?: string
          read_at?: string | null
          retry_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          step_id: string
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          delivered_at?: string | null
          enrollment_id?: string
          error?: string | null
          id?: string
          read_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_id?: string
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_message_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_message_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "drip_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_message_logs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "drip_campaign_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          email_signature: string | null
          encrypted_access_token: string | null
          encrypted_password: string | null
          encrypted_refresh_token: string | null
          error_message: string | null
          id: string
          imap_host: string | null
          imap_port: number | null
          imap_username: string | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          smtp_host: string | null
          smtp_port: number | null
          smtp_username: string | null
          status: string | null
          sync_enabled: boolean | null
          sync_from_date: string | null
          sync_interval_minutes: number | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          email_signature?: string | null
          encrypted_access_token?: string | null
          encrypted_password?: string | null
          encrypted_refresh_token?: string | null
          error_message?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          imap_username?: string | null
          last_sync_at?: string | null
          organization_id: string
          provider: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          status?: string | null
          sync_enabled?: boolean | null
          sync_from_date?: string | null
          sync_interval_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          email_signature?: string | null
          encrypted_access_token?: string | null
          encrypted_password?: string | null
          encrypted_refresh_token?: string | null
          error_message?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          imap_username?: string | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          status?: string | null
          sync_enabled?: boolean | null
          sync_from_date?: string | null
          sync_interval_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          created_at: string | null
          encrypted_data_key: string
          expires_at: string
          id: string
          is_active: boolean | null
          key_version: number
          kms_key_id: string
          organization_id: string | null
          rotated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_data_key: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          key_version: number
          kms_key_id: string
          organization_id?: string | null
          rotated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_data_key?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          key_version?: number
          kms_key_id?: string
          organization_id?: string | null
          rotated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encryption_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_accounts: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          encrypted_access_token: string
          error_message: string | null
          facebook_page_id: string
          id: string
          instagram_user_id: string
          instagram_username: string
          last_synced_at: string | null
          organization_id: string
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          encrypted_access_token: string
          error_message?: string | null
          facebook_page_id: string
          id?: string
          instagram_user_id: string
          instagram_username: string
          last_synced_at?: string | null
          organization_id: string
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          encrypted_access_token?: string
          error_message?: string | null
          facebook_page_id?: string
          id?: string
          instagram_user_id?: string
          instagram_username?: string
          last_synced_at?: string | null
          organization_id?: string
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          data: Json | null
          error: string | null
          id: string
          job_id: string
          job_name: string
          status: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          error?: string | null
          id?: string
          job_id: string
          job_name: string
          status: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          error?: string | null
          id?: string
          job_id?: string
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      job_schedules: {
        Row: {
          created_at: string | null
          cron_expression: string
          id: string
          is_active: boolean | null
          job_name: string
          last_run_at: string | null
          next_run_at: string | null
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          id?: string
          is_active?: boolean | null
          job_name: string
          last_run_at?: string | null
          next_run_at?: string | null
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          id?: string
          is_active?: boolean | null
          job_name?: string
          last_run_at?: string | null
          next_run_at?: string | null
        }
        Relationships: []
      }
      key_rotation_log: {
        Row: {
          created_at: string | null
          id: string
          new_key_version: number
          old_key_version: number
          organization_id: string | null
          rotation_reason: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_key_version: number
          old_key_version: number
          organization_id?: string | null
          rotation_reason?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          new_key_version?: number
          old_key_version?: number
          organization_id?: string | null
          rotation_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_rotation_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string | null
          channel_message_id: string | null
          channel_metadata: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          delivered_at: string | null
          id: string
          is_read: boolean | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string | null
          read_at: string | null
          sender_id: string | null
          sender_type: string
          whatsapp_message_id: string | null
        }
        Insert: {
          channel?: string | null
          channel_message_id?: string | null
          channel_metadata?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          id?: string
          is_read?: boolean | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
          sender_type: string
          whatsapp_message_id?: string | null
        }
        Update: {
          channel?: string | null
          channel_message_id?: string | null
          channel_metadata?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          id?: string
          is_read?: boolean | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
          sender_type?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_hours: Json | null
          created_at: string | null
          id: string
          logo_url: string | null
          max_team_members: number
          name: string
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string | null
          used_team_members: number
          whatsapp_access_token: string | null
          whatsapp_business_account_id: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_webhook_verify_token: string | null
        }
        Insert: {
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_team_members?: number
          name: string
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          used_team_members?: number
          whatsapp_access_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_webhook_verify_token?: string | null
        }
        Update: {
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_team_members?: number
          name?: string
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          used_team_members?: number
          whatsapp_access_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_webhook_verify_token?: string | null
        }
        Relationships: []
      }
      payment_authentication_events: {
        Row: {
          authentication_type: string
          challenge_url: string | null
          created_at: string | null
          id: string
          payment_intent_id: string | null
          status: string
        }
        Insert: {
          authentication_type: string
          challenge_url?: string | null
          created_at?: string | null
          id?: string
          payment_intent_id?: string | null
          status: string
        }
        Update: {
          authentication_type?: string
          challenge_url?: string | null
          created_at?: string | null
          id?: string
          payment_intent_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_authentication_events_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_compliance_logs: {
        Row: {
          compliance_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          payment_intent_id: string | null
          verification_status: string
        }
        Insert: {
          compliance_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          verification_status: string
        }
        Update: {
          compliance_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_compliance_logs_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          organization_id: string | null
          payment_method_id: string | null
          status: string
          stripe_payment_intent_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_method_id?: string | null
          status: string
          stripe_payment_intent_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_method_id?: string | null
          status?: string
          stripe_payment_intent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bubble_color_preference: string | null
          bubble_text_color_preference: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_super_admin: boolean
          last_seen: string | null
          last_seen_at: string | null
          mfa_backup_codes: string[] | null
          mfa_enabled: boolean | null
          mfa_enrolled_at: string | null
          mfa_secret: string | null
          organization_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bubble_color_preference?: string | null
          bubble_text_color_preference?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_super_admin?: boolean
          last_seen?: string | null
          last_seen_at?: string | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_enrolled_at?: string | null
          mfa_secret?: string | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bubble_color_preference?: string | null
          bubble_text_color_preference?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean
          last_seen?: string | null
          last_seen_at?: string | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_enrolled_at?: string | null
          mfa_secret?: string | null
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          previous_status: string
          refund_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          previous_status: string
          refund_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string
          refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_history_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_notifications: {
        Row: {
          created_at: string | null
          id: string
          notification_type: string
          recipient_email: string
          refund_id: string | null
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          refund_id?: string | null
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          refund_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_notifications_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          payment_intent_id: string | null
          processed_at: string | null
          reason: string | null
          requested_by: string | null
          status: string
          stripe_refund_id: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          payment_intent_id?: string | null
          processed_at?: string | null
          reason?: string | null
          requested_by?: string | null
          status: string
          stripe_refund_id: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          payment_intent_id?: string | null
          processed_at?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          stripe_refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_history: {
        Row: {
          accepted: boolean
          assigned_to: string
          available_agents: string[]
          conversation_id: string
          created_at: string
          id: string
          organization_id: string
          rejected_at: string | null
          rejection_reason: string | null
          routed_at: string
          routing_strategy: string
          selection_reason: string | null
          workload_scores: Json | null
        }
        Insert: {
          accepted?: boolean
          assigned_to: string
          available_agents: string[]
          conversation_id: string
          created_at?: string
          id?: string
          organization_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          routed_at?: string
          routing_strategy: string
          selection_reason?: string | null
          workload_scores?: Json | null
        }
        Update: {
          accepted?: boolean
          assigned_to?: string
          available_agents?: string[]
          conversation_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          routed_at?: string
          routing_strategy?: string
          selection_reason?: string | null
          workload_scores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_history_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          priority: number
          rule_name: string
          strategy: string
          strategy_config: Json | null
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          priority?: number
          rule_name: string
          strategy: string
          strategy_config?: Json | null
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          priority?: number
          rule_name?: string
          strategy?: string
          strategy_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_activity_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_activity_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sla_rules: {
        Row: {
          conditions: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          escalate_on_breach: boolean | null
          escalate_to_role: string | null
          id: string
          name: string
          organization_id: string
          priority: number | null
          rule_type: string
          target_minutes: number | null
          target_score: number | null
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          escalate_on_breach?: boolean | null
          escalate_to_role?: string | null
          id?: string
          name: string
          organization_id: string
          priority?: number | null
          rule_type: string
          target_minutes?: number | null
          target_score?: number | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          escalate_on_breach?: boolean | null
          escalate_to_role?: string | null
          id?: string
          name?: string
          organization_id?: string
          priority?: number | null
          rule_type?: string
          target_minutes?: number | null
          target_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_tracking: {
        Row: {
          breach_duration_minutes: number | null
          breached: boolean | null
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          id: string
          sla_rule_id: string
          status: string | null
          target_time: string
          updated_at: string | null
        }
        Insert: {
          breach_duration_minutes?: number | null
          breached?: boolean | null
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          sla_rule_id: string
          status?: string | null
          target_time: string
          updated_at?: string | null
        }
        Update: {
          breach_duration_minutes?: number | null
          breached?: boolean | null
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          sla_rule_id?: string
          status?: string | null
          target_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_tracking_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_tracking_sla_rule_id_fkey"
            columns: ["sla_rule_id"]
            isOneToOne: false
            referencedRelation: "sla_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_accounts: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          encrypted_twilio_auth_token: string
          error_message: string | null
          id: string
          last_verified_at: string | null
          organization_id: string
          phone_number: string
          status: string | null
          twilio_account_sid: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          encrypted_twilio_auth_token: string
          error_message?: string | null
          id?: string
          last_verified_at?: string | null
          organization_id: string
          phone_number: string
          status?: string | null
          twilio_account_sid: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          encrypted_twilio_auth_token?: string
          error_message?: string | null
          id?: string
          last_verified_at?: string | null
          organization_id?: string
          phone_number?: string
          status?: string | null
          twilio_account_sid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category_id: string | null
          color_class: string
          color_hex: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category_id?: string | null
          color_class?: string
          color_hex?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category_id?: string | null
          color_class?: string
          color_hex?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tag_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role: string
          status?: string
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage_analytics: {
        Row: {
          agent_id: string | null
          created_at: string | null
          date: string
          id: string
          organization_id: string
          template_id: string
          times_used: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          organization_id: string
          template_id: string
          times_used?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          organization_id?: string
          template_id?: string
          times_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_analytics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      webchat_widgets: {
        Row: {
          allow_file_uploads: boolean | null
          allowed_domains: string[] | null
          created_at: string | null
          enabled: boolean | null
          greeting_message: string | null
          id: string
          offline_message: string | null
          organization_id: string
          position: string | null
          primary_color: string | null
          require_email: boolean | null
          require_name: boolean | null
          respect_business_hours: boolean | null
          show_agent_avatars: boolean | null
          show_agent_names: boolean | null
          total_conversations: number | null
          updated_at: string | null
          widget_name: string
        }
        Insert: {
          allow_file_uploads?: boolean | null
          allowed_domains?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          greeting_message?: string | null
          id?: string
          offline_message?: string | null
          organization_id: string
          position?: string | null
          primary_color?: string | null
          require_email?: boolean | null
          require_name?: boolean | null
          respect_business_hours?: boolean | null
          show_agent_avatars?: boolean | null
          show_agent_names?: boolean | null
          total_conversations?: number | null
          updated_at?: string | null
          widget_name: string
        }
        Update: {
          allow_file_uploads?: boolean | null
          allowed_domains?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          greeting_message?: string | null
          id?: string
          offline_message?: string | null
          organization_id?: string
          position?: string | null
          primary_color?: string | null
          require_email?: boolean | null
          require_name?: boolean | null
          respect_business_hours?: boolean | null
          show_agent_avatars?: boolean | null
          show_agent_names?: boolean | null
          total_conversations?: number | null
          updated_at?: string | null
          widget_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "webchat_widgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          retry_count: number | null
          status: string
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          status: string
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          organization_id: string | null
          payload: Json
          processed_at: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          payload: Json
          processed_at?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          processed_at?: string | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_processing_errors: {
        Row: {
          created_at: string | null
          error_message: string
          error_type: string
          id: string
          stack_trace: string | null
          webhook_event_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_type: string
          id?: string
          stack_trace?: string | null
          webhook_event_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_type?: string
          id?: string
          stack_trace?: string | null
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_processing_errors_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          contact_id: string
          context: Json | null
          created_at: string | null
          current_node_id: string | null
          error_message: string | null
          error_node_id: string | null
          execution_path: Json | null
          id: string
          next_execution_at: string | null
          organization_id: string
          retry_count: number | null
          started_at: string | null
          status: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          context?: Json | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          error_node_id?: string | null
          execution_path?: Json | null
          id?: string
          next_execution_at?: string | null
          organization_id: string
          retry_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          context?: Json | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          error_node_id?: string | null
          execution_path?: Json | null
          id?: string
          next_execution_at?: string | null
          organization_id?: string
          retry_count?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string
          created_at: string | null
          default_settings: Json | null
          description: string
          edges: Json
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          name: string
          nodes: Json
          preview_image_url: string | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_settings?: Json | null
          description: string
          edges: Json
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name: string
          nodes: Json
          preview_image_url?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_settings?: Json | null
          description?: string
          edges?: Json
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name?: string
          nodes?: Json
          preview_image_url?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      workflow_versions: {
        Row: {
          change_note: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          edges: Json
          id: string
          name: string
          nodes: Json
          settings: Json
          version: number
          workflow_id: string
        }
        Insert: {
          change_note?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges: Json
          id?: string
          name: string
          nodes: Json
          settings: Json
          version: number
          workflow_id: string
        }
        Update: {
          change_note?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          settings?: Json
          version?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          edges: Json
          id: string
          name: string
          nodes: Json
          organization_id: string
          settings: Json
          stats: Json | null
          status: string
          type: string
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          organization_id: string
          settings?: Json
          stats?: Json | null
          status?: string
          type: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          organization_id?: string
          settings?: Json
          stats?: Json | null
          status?: string
          type?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_usage_analytics: {
        Row: {
          accepted_count: number | null
          avg_confidence: number | null
          avg_latency_ms: number | null
          feature: string | null
          organization_id: string | null
          rejected_count: number | null
          request_count: number | null
          total_cost_usd: number | null
          total_tokens: number | null
          usage_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_cache_hit_rate: {
        Row: {
          heap_hit: number | null
          heap_read: number | null
          hit_rate_percentage: number | null
        }
        Relationships: []
      }
      performance_index_usage: {
        Row: {
          index_name: unknown
          index_scans: number | null
          schemaname: unknown
          table_name: unknown
          tuples_fetched: number | null
          tuples_read: number | null
        }
        Relationships: []
      }
      performance_slow_queries: {
        Row: {
          calls: number | null
          mean_exec_time: number | null
          query: string | null
          rows: number | null
          total_exec_time: number | null
        }
        Relationships: []
      }
      performance_table_sizes: {
        Row: {
          index_size: string | null
          schemaname: unknown
          table_name: unknown
          table_size: string | null
          total_size: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_team_invitation:
        | { Args: { invitation_token: string; user_id: string }; Returns: Json }
        | {
            Args: { p_token: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.accept_team_invitation(p_token => text), public.accept_team_invitation(p_token => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_token: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.accept_team_invitation(p_token => text), public.accept_team_invitation(p_token => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      calculate_lead_score: { Args: { p_contact_id: string }; Returns: number }
      check_ai_budget: { Args: { p_organization_id: string }; Returns: Json }
      check_available_licenses: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      cleanup_old_sync_logs: { Args: { p_days?: number }; Returns: number }
      create_workflow_version: {
        Args: { p_changes?: Json; p_workflow_id: string }
        Returns: string
      }
      current_organization_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      detect_sync_conflicts: {
        Args: { p_organization_id: string }
        Returns: {
          contact_id: string
          field_name: string
          local_value: string
          remote_value: string
        }[]
      }
      expire_old_invitations: { Args: never; Returns: number }
      get_conversation_unread_count: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      get_crm_connection_status:
        | {
            Args: { p_organization_id: string }
            Returns: {
              last_sync: string
              provider: string
              status: string
              total_contacts: number
            }[]
          }
        | {
            Args: { p_crm_type: string; p_organization_id: string }
            Returns: {
              connected: boolean
              last_sync: string
              sync_errors: number
              total_contacts: number
            }[]
          }
      get_organization_logo_url: {
        Args: { p_organization_id: string }
        Returns: string
      }
      get_user_organization: { Args: never; Returns: string }
      is_service_role: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_api_key_event: {
        Args: { p_api_key_id: string; p_event_type: string; p_metadata?: Json }
        Returns: undefined
      }
      log_invitation_event: {
        Args: {
          p_event_type: string
          p_invitation_id: string
          p_metadata?: Json
          p_new_status?: string
          p_old_status?: string
          p_performed_by?: string
        }
        Returns: undefined
      }
      refresh_ai_usage_analytics: { Args: never; Returns: undefined }
      schedule_next_drip_message: {
        Args: { p_enrollment_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_business_hours: { Args: { p_hours: Json }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone"],
      oauth_authorization_status: ["pending", "approved", "denied", "expired"],
      oauth_client_type: ["public", "confidential"],
      oauth_registration_type: ["dynamic", "manual"],
      oauth_response_type: ["code"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// Database table row types (extracted for easier use)
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type MessageTemplate = Database['public']['Tables']['message_templates']['Row']
export type AutomationRule = Database['public']['Tables']['automation_rules']['Row']
export type AIResponse = Database['public']['Tables']['ai_responses']['Row']
export type AISetting = Database['public']['Tables']['ai_settings']['Row']
export type Workflow = Database['public']['Tables']['workflows']['Row']
export type WorkflowExecution = Database['public']['Tables']['workflow_executions']['Row']
export type DripCampaign = Database['public']['Tables']['drip_campaigns']['Row']
export type DripCampaignStep = Database['public']['Tables']['drip_campaign_steps']['Row']
export type BulkCampaign = Database['public']['Tables']['bulk_campaigns']['Row']
export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row']
export type Refund = Database['public']['Tables']['refunds']['Row']
export type PaymentIntent = Database['public']['Tables']['payment_intents']['Row']
export type AgentCapacity = Database['public']['Tables']['agent_capacity']['Row']
export type ConversationQueue = Database['public']['Tables']['conversation_queue']['Row']
export type RoutingHistory = Database['public']['Tables']['routing_history']['Row']
export type RoutingRule = Database['public']['Tables']['routing_rules']['Row']
export type ContactSegment = Database['public']['Tables']['contact_segments']['Row']
export type ContactTag = Database['public']['Tables']['contact_tags']['Row']
export type CRMConnection = Database['public']['Tables']['crm_connections']['Row']
export type TeamInvitation = Database['public']['Tables']['team_invitations']['Row']

// Insert types
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageTemplateInsert = Database['public']['Tables']['message_templates']['Insert']
export type AutomationRuleInsert = Database['public']['Tables']['automation_rules']['Insert']
export type WorkflowInsert = Database['public']['Tables']['workflows']['Insert']
export type WebhookEventInsert = Database['public']['Tables']['webhook_events']['Insert']
export type AgentCapacityInsert = Database['public']['Tables']['agent_capacity']['Insert']
export type ConversationQueueInsert = Database['public']['Tables']['conversation_queue']['Insert']

// Update types
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']
export type MessageTemplateUpdate = Database['public']['Tables']['message_templates']['Update']
export type AutomationRuleUpdate = Database['public']['Tables']['automation_rules']['Update']
export type WorkflowUpdate = Database['public']['Tables']['workflows']['Update']
export type AgentCapacityUpdate = Database['public']['Tables']['agent_capacity']['Update']
export type ConversationQueueUpdate = Database['public']['Tables']['conversation_queue']['Update']
