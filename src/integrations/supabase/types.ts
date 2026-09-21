export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checkout_events: {
        Row: {
          checkout_session_id: string
          created_at: string
          error_code: string | null
          error_message: string | null
          event: string
          id: string
          pack: string | null
          pathname: string | null
          shipping: string | null
          stripe_payment_intent_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          checkout_session_id: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event: string
          id?: string
          pack?: string | null
          pathname?: string | null
          shipping?: string | null
          stripe_payment_intent_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          checkout_session_id?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event?: string
          id?: string
          pack?: string | null
          pathname?: string | null
          shipping?: string | null
          stripe_payment_intent_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      checkout_initiations: {
        Row: {
          created_at: string
          fbclid: string | null
          gclid: string | null
          id: string
          pack: string | null
          sck: string | null
          src: string | null
          ttclid: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          pack?: string | null
          sck?: string | null
          src?: string | null
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          pack?: string | null
          sck?: string | null
          src?: string | null
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      checkout_orders: {
        Row: {
          apartment: string | null
          city: string
          country: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          pack: string
          paid_at: string | null
          phone: string | null
          postal_code: string
          shipping: string | null
          shipping_amount: number | null
          shopify_order_id: string | null
          status: string
          street: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          apartment?: string | null
          city: string
          country?: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          pack: string
          paid_at?: string | null
          phone?: string | null
          postal_code: string
          shipping?: string | null
          shipping_amount?: number | null
          shopify_order_id?: string | null
          status?: string
          street: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          apartment?: string | null
          city?: string
          country?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          pack?: string
          paid_at?: string | null
          phone?: string | null
          postal_code?: string
          shipping?: string | null
          shipping_amount?: number | null
          shopify_order_id?: string | null
          status?: string
          street?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      processed_stripe_payments: {
        Row: {
          completed_at: string | null
          created_at: string
          payment_intent_id: string
          shopify_order_id: string | null
          shopify_order_name: string | null
          status: string
          stripe_event_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          payment_intent_id: string
          shopify_order_id?: string | null
          shopify_order_name?: string | null
          status?: string
          stripe_event_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          payment_intent_id?: string
          shopify_order_id?: string | null
          shopify_order_name?: string | null
          status?: string
          stripe_event_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sale_attributions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          livemode: boolean
          pack: string | null
          paid_at: string
          sck: string | null
          src: string | null
          stripe_payment_intent_id: string
          ttclid: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          utmify_status: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          livemode?: boolean
          pack?: string | null
          paid_at?: string
          sck?: string | null
          src?: string | null
          stripe_payment_intent_id: string
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utmify_status?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          livemode?: boolean
          pack?: string | null
          paid_at?: string
          sck?: string | null
          src?: string | null
          stripe_payment_intent_id?: string
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utmify_status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
