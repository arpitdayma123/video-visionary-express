export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      competitors: {
        Row: {
          created_at: string
          id: string
          project_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount: number
          created_at: string
          credits: number
          currency: string
          id: string
          order_id: string
          payment_session_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits: number
          currency: string
          id?: string
          order_id: string
          payment_session_id?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          order_id?: string
          payment_session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          competitors: string[] | null
          counter: number
          created_at: string | null
          credit: number
          custom_script: string | null
          email: string | null
          has_seen_tutorial: boolean | null
          id: string
          message: string | null
          reel_url: string | null
          result: Json | null
          script_option: string | null
          selected_niches: string[] | null
          selected_video: Json | null
          selected_voice: Json | null
          status: string | null
          updated_at: string | null
          videos: Json[] | null
          voice_files: Json[] | null
        }
        Insert: {
          competitors?: string[] | null
          counter?: number
          created_at?: string | null
          credit?: number
          custom_script?: string | null
          email?: string | null
          has_seen_tutorial?: boolean | null
          id: string
          message?: string | null
          reel_url?: string | null
          result?: Json | null
          script_option?: string | null
          selected_niches?: string[] | null
          selected_video?: Json | null
          selected_voice?: Json | null
          status?: string | null
          updated_at?: string | null
          videos?: Json[] | null
          voice_files?: Json[] | null
        }
        Update: {
          competitors?: string[] | null
          counter?: number
          created_at?: string | null
          credit?: number
          custom_script?: string | null
          email?: string | null
          has_seen_tutorial?: boolean | null
          id?: string
          message?: string | null
          reel_url?: string | null
          result?: Json | null
          script_option?: string | null
          selected_niches?: string[] | null
          selected_video?: Json | null
          selected_voice?: Json | null
          status?: string | null
          updated_at?: string | null
          videos?: Json[] | null
          voice_files?: Json[] | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      selected_niches: {
        Row: {
          created_at: string
          id: string
          niche: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          niche: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          niche?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selected_niches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          size: number
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          size: number
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          size?: number
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_files: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          size: number
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          size: number
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          size?: number
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      zocktodumbme: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      zocktomain: {
        Row: {
          "agent script": string | null
          audio: string | null
          caption: string | null
          comment_count: number | null
          created_at: string
          follower_count: number | null
          id: string
          like_count: number | null
          "reel url": string | null
          reshare_count: number | null
          thumbanil: string | null
          username: string | null
          videoid: string | null
          views: number | null
        }
        Insert: {
          "agent script"?: string | null
          audio?: string | null
          caption?: string | null
          comment_count?: number | null
          created_at?: string
          follower_count?: number | null
          id: string
          like_count?: number | null
          "reel url"?: string | null
          reshare_count?: number | null
          thumbanil?: string | null
          username?: string | null
          videoid?: string | null
          views?: number | null
        }
        Update: {
          "agent script"?: string | null
          audio?: string | null
          caption?: string | null
          comment_count?: number | null
          created_at?: string
          follower_count?: number | null
          id?: string
          like_count?: number | null
          "reel url"?: string | null
          reshare_count?: number | null
          thumbanil?: string | null
          username?: string | null
          videoid?: string | null
          views?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_payment_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_credits: {
        Args: {
          p_user_id: string
          p_credits_to_add: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
