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
  graphql_public: {
    Tables: { [_ in never]: never }
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
      active_timer_runs: {
        Row: { accumulated_seconds: number; created_at: string; id: string; notes: string | null; project_id: string | null; segment_started_at: string | null; status: string; target_seconds: number | null; task_id: string | null; timer_mode: Database["public"]["Enums"]["timer_mode_type"]; timezone: string; title: string | null; type: Database["public"]["Enums"]["session_type"]; updated_at: string; user_id: string }
        Insert: { accumulated_seconds?: number; created_at?: string; id?: string; notes?: string | null; project_id?: string | null; segment_started_at?: string | null; status?: string; target_seconds?: number | null; task_id?: string | null; timer_mode: Database["public"]["Enums"]["timer_mode_type"]; timezone: string; title?: string | null; type: Database["public"]["Enums"]["session_type"]; updated_at?: string; user_id: string }
        Update: { accumulated_seconds?: number; created_at?: string; id?: string; notes?: string | null; project_id?: string | null; segment_started_at?: string | null; status?: string; target_seconds?: number | null; task_id?: string | null; timer_mode?: Database["public"]["Enums"]["timer_mode_type"]; timezone?: string; title?: string | null; type?: Database["public"]["Enums"]["session_type"]; updated_at?: string; user_id?: string }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          daily_goal_met: boolean
          date: string
          focus_minutes: number
          id: string
          session_count: number
          trusted_focus_minutes: number
          trusted_session_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_goal_met?: boolean
          date: string
          focus_minutes?: number
          id?: string
          session_count?: number
          trusted_focus_minutes?: number
          trusted_session_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_goal_met?: boolean
          date?: string
          focus_minutes?: number
          id?: string
          session_count?: number
          trusted_focus_minutes?: number
          trusted_session_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_leaderboard_members: {
        Row: { created_at: string; ended_at: string | null; frozen_focus_minutes: number | null; frozen_session_count: number | null; id: string; joined_at: string; leaderboard_id: string; role: string; status: string; updated_at: string; user_id: string }
        Insert: { created_at?: string; ended_at?: string | null; frozen_focus_minutes?: number | null; frozen_session_count?: number | null; id?: string; joined_at?: string; leaderboard_id: string; role?: string; status?: string; updated_at?: string; user_id: string }
        Update: { created_at?: string; ended_at?: string | null; frozen_focus_minutes?: number | null; frozen_session_count?: number | null; id?: string; joined_at?: string; leaderboard_id?: string; role?: string; status?: string; updated_at?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "group_leaderboard_members_leaderboard_id_fkey"; columns: ["leaderboard_id"]; isOneToOne: false; referencedRelation: "group_leaderboards"; referencedColumns: ["id"] },
          { foreignKeyName: "group_leaderboard_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      group_leaderboards: {
        Row: { closed_at: string | null; closed_period_key: string | null; created_at: string; goal_minutes: number | null; id: string; invite_code: string; name: string; owner_id: string; period_type: Database["public"]["Enums"]["period_type"]; status: string; timezone: string; updated_at: string }
        Insert: { closed_at?: string | null; closed_period_key?: string | null; created_at?: string; goal_minutes?: number | null; id?: string; invite_code: string; name: string; owner_id: string; period_type: Database["public"]["Enums"]["period_type"]; status?: string; timezone: string; updated_at?: string }
        Update: { closed_at?: string | null; closed_period_key?: string | null; created_at?: string; goal_minutes?: number | null; id?: string; invite_code?: string; name?: string; owner_id?: string; period_type?: Database["public"]["Enums"]["period_type"]; status?: string; timezone?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "group_leaderboards_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      goals: {
        Row: {
          created_at: string
          daily_goal_minutes: number | null
          id: string
          updated_at: string
          user_id: string
          weekly_goal_minutes: number | null
        }
        Insert: {
          created_at?: string
          daily_goal_minutes?: number | null
          id?: string
          updated_at?: string
          user_id: string
          weekly_goal_minutes?: number | null
        }
        Update: {
          created_at?: string
          daily_goal_minutes?: number | null
          id?: string
          updated_at?: string
          user_id?: string
          weekly_goal_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number
          display_name: string
          id: string
          is_founding_member: boolean
          is_public: boolean
          is_seed_account: boolean
          last_focus_date: string | null
          longest_streak: number
          member_since: string
          plan: Database["public"]["Enums"]["plan_type"]
          plan_interval:
            | Database["public"]["Enums"]["plan_interval_type"]
            | null
          profile_slug: string
          show_heatmap_on_profile: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status_type"]
            | null
          total_focus_minutes: number
          total_sessions: number
          trusted_focus_minutes: number
          trusted_sessions: number
          trusted_current_streak: number
          trusted_longest_streak: number
          trusted_last_focus_date: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          display_name: string
          id: string
          is_founding_member?: boolean
          is_public?: boolean
          is_seed_account?: boolean
          last_focus_date?: string | null
          longest_streak?: number
          member_since?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_interval?:
            | Database["public"]["Enums"]["plan_interval_type"]
            | null
          profile_slug: string
          show_heatmap_on_profile?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status_type"]
            | null
          total_focus_minutes?: number
          total_sessions?: number
          trusted_focus_minutes?: number
          trusted_sessions?: number
          trusted_current_streak?: number
          trusted_longest_streak?: number
          trusted_last_focus_date?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          is_founding_member?: boolean
          is_public?: boolean
          is_seed_account?: boolean
          last_focus_date?: string | null
          longest_streak?: number
          member_since?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_interval?:
            | Database["public"]["Enums"]["plan_interval_type"]
            | null
          profile_slug?: string
          show_heatmap_on_profile?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status_type"]
            | null
          total_focus_minutes?: number
          total_sessions?: number
          trusted_focus_minutes?: number
          trusted_sessions?: number
          trusted_current_streak?: number
          trusted_longest_streak?: number
          trusted_last_focus_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          last_used_at: string | null
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          last_used_at?: string | null
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          last_used_at?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          duration_mins: number
          ended_at: string
          id: string
          is_manual: boolean
          is_trusted: boolean
          excluded_at: string | null
          excluded_reason: string | null
          local_date: string | null
          title: string | null
          notes: string | null
          project_id: string | null
          started_at: string
          task_id: string | null
          timer_mode: Database["public"]["Enums"]["timer_mode_type"] | null
          type: Database["public"]["Enums"]["session_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_mins: number
          ended_at: string
          id?: string
          is_manual?: boolean
          is_trusted?: boolean
          excluded_at?: string | null
          excluded_reason?: string | null
          local_date?: string | null
          title?: string | null
          notes?: string | null
          project_id?: string | null
          started_at: string
          task_id?: string | null
          timer_mode?: Database["public"]["Enums"]["timer_mode_type"] | null
          type: Database["public"]["Enums"]["session_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_mins?: number
          ended_at?: string
          id?: string
          is_manual?: boolean
          is_trusted?: boolean
          excluded_at?: string | null
          excluded_reason?: string | null
          local_date?: string | null
          title?: string | null
          notes?: string | null
          project_id?: string | null
          started_at?: string
          task_id?: string | null
          timer_mode?: Database["public"]["Enums"]["timer_mode_type"] | null
          type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_cents: number
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          plan_interval: Database["public"]["Enums"]["plan_interval_type"]
          status: Database["public"]["Enums"]["subscription_status_type"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end: string
          current_period_start: string
          id?: string
          plan: Database["public"]["Enums"]["plan_type"]
          plan_interval: Database["public"]["Enums"]["plan_interval_type"]
          status: Database["public"]["Enums"]["subscription_status_type"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_interval?: Database["public"]["Enums"]["plan_interval_type"]
          status?: Database["public"]["Enums"]["subscription_status_type"]
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_pomodoros: number
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_pomodoros: number | null
          id: string
          kanban_order: number
          list_order: number
          priority: Database["public"]["Enums"]["task_priority_type"]
          project_id: string
          status: Database["public"]["Enums"]["task_status_type"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_pomodoros?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_pomodoros?: number | null
          id?: string
          kanban_order?: number
          list_order?: number
          priority?: Database["public"]["Enums"]["task_priority_type"]
          project_id: string
          status?: Database["public"]["Enums"]["task_status_type"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_pomodoros?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_pomodoros?: number | null
          id?: string
          kanban_order?: number
          list_order?: number
          priority?: Database["public"]["Enums"]["task_priority_type"]
          project_id?: string
          status?: Database["public"]["Enums"]["task_status_type"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_start_break: boolean
          auto_start_focus: boolean
          created_at: string
          daily_reminder_enabled: boolean
          daily_reminder_time: string | null
          id: string
          pomodoro_break_mins: number
          pomodoro_focus_mins: number
          sound_enabled: boolean
          sound_option: string
          streak_reminder_enabled: boolean
          theme: Database["public"]["Enums"]["theme_type"]
          timer_default_mode: Database["public"]["Enums"]["timer_mode_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_start_break?: boolean
          auto_start_focus?: boolean
          created_at?: string
          daily_reminder_enabled?: boolean
          daily_reminder_time?: string | null
          id?: string
          pomodoro_break_mins?: number
          pomodoro_focus_mins?: number
          sound_enabled?: boolean
          sound_option?: string
          streak_reminder_enabled?: boolean
          theme?: Database["public"]["Enums"]["theme_type"]
          timer_default_mode?: Database["public"]["Enums"]["timer_mode_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_start_break?: boolean
          auto_start_focus?: boolean
          created_at?: string
          daily_reminder_enabled?: boolean
          daily_reminder_time?: string | null
          id?: string
          pomodoro_break_mins?: number
          pomodoro_focus_mins?: number
          sound_enabled?: boolean
          sound_option?: string
          streak_reminder_enabled?: boolean
          theme?: Database["public"]["Enums"]["theme_type"]
          timer_default_mode?: Database["public"]["Enums"]["timer_mode_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          focus_minutes: number
          id: string
          period_key: string
          period_type: Database["public"]["Enums"]["period_type"]
          session_count: number
          trusted_focus_minutes: number
          trusted_session_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          focus_minutes?: number
          id?: string
          period_key: string
          period_type: Database["public"]["Enums"]["period_type"]
          session_count?: number
          trusted_focus_minutes?: number
          trusted_session_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          focus_minutes?: number
          id?: string
          period_key?: string
          period_type?: Database["public"]["Enums"]["period_type"]
          session_count?: number
          trusted_focus_minutes?: number
          trusted_session_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          current_streak: number
          display_name: string
          id: string
          is_public: boolean
          last_focus_date: string | null
          longest_streak: number
          member_since: string
          profile_slug: string
          show_heatmap_on_profile: boolean
          total_focus_minutes: number
          total_sessions: number
          trusted_focus_minutes: number
          trusted_sessions: number
          trusted_current_streak: number
          trusted_longest_streak: number
          trusted_last_focus_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      close_group_leaderboard: { Args: { p_leaderboard_id: string }; Returns: undefined }
      create_project: {
        Args: { p_color: string; p_icon?: string | null; p_name: string }
        Returns: Database["public"]["Tables"]["projects"]["Row"]
      }
      create_group_leaderboard: { Args: { p_goal_minutes: number | null; p_name: string; p_period_type: Database["public"]["Enums"]["period_type"]; p_timezone: string }; Returns: string }
      export_my_sessions: {
        Args: { p_end_date?: string | null; p_include_breaks?: boolean; p_limit?: number; p_offset?: number; p_project_id?: string | null; p_start_date?: string | null; p_timezone?: string }
        Returns: Array<Database["public"]["Tables"]["sessions"]["Row"] & { project_color: string | null; project_name: string | null; task_title: string | null }>
      }
      get_analytics_daily_summaries: {
        Args: { p_end_date: string; p_start_date: string; p_timezone: string }
        Returns: Array<Database["public"]["Tables"]["daily_summaries"]["Row"]>
      }
      get_analytics_sessions: {
        Args: { p_end_date?: string | null; p_project_filter_mode?: string; p_project_id?: string | null; p_start_date?: string | null; p_timezone?: string }
        Returns: Array<Database["public"]["Tables"]["sessions"]["Row"] & { project_color: string | null; project_name: string | null }>
      }
      get_global_leaderboard: {
        Args: { p_limit?: number; p_period_key?: string | null; p_period_type?: Database["public"]["Enums"]["period_type"] | null }
        Returns: Array<{ avatar_url: string | null; current_streak: number; display_name: string; focus_minutes: number; last_focus_date: string | null; profile_slug: string; rank: number; session_count: number; user_id: string }>
      }
      get_global_streak_leaderboard: {
        Args: { p_limit?: number; p_mode: string }
        Returns: Array<{ avatar_url: string | null; current_streak: number; display_name: string; longest_streak: number; profile_slug: string; rank: number; user_id: string }>
      }
      get_group_leaderboard: {
        Args: { p_leaderboard_id: string }
        Returns: Array<{ closed_at: string | null; closed_period_key: string | null; created_at: string; current_period_key: string; goal_minutes: number | null; id: string; invite_code: string; member_count: number; name: string; owner_id: string; period_ends_at: string | null; period_type: Database["public"]["Enums"]["period_type"]; role: string; status: string; timezone: string }>
      }
      get_group_leaderboard_ranking: {
        Args: { p_leaderboard_id: string }
        Returns: Array<{ avatar_url: string | null; display_name: string; focus_minutes: number; joined_at: string; rank: number; role: string; session_count: number; user_id: string }>
      }
      get_sessions_page: {
        Args: {
          p_from_date: string | null
          p_max_duration: number | null
          p_min_duration: number | null
          p_page: number
          p_page_size: number
          p_project_id: string | null
          p_search: string | null
          p_timezone: string
          p_to_date: string | null
          p_type: Database["public"]["Enums"]["session_type"] | null
        }
        Returns: Array<
          Database["public"]["Tables"]["sessions"]["Row"] & {
            project_color: string | null
            project_name: string | null
            task_title: string | null
            total_count: number
          }
        >
      }
      get_monthly_focus_session_count: { Args: { p_timezone: string }; Returns: number }
      get_my_global_leaderboard_rank: {
        Args: { p_period_key: string; p_period_type: Database["public"]["Enums"]["period_type"] }
        Returns: Array<{ focus_minutes: number; rank: number }>
      }
      is_profile_slug_available: { Args: { p_slug: string }; Returns: boolean }
      join_group_leaderboard: { Args: { p_invite_code: string }; Returns: string }
      leave_group_leaderboard: { Args: { p_leaderboard_id: string }; Returns: undefined }
      list_my_group_leaderboards: {
        Args: Record<PropertyKey, never>
        Returns: Array<{ closed_at: string | null; closed_period_key: string | null; created_at: string; current_period_key: string; goal_minutes: number | null; id: string; invite_code: string; member_count: number; name: string; owner_id: string; period_ends_at: string | null; period_type: Database["public"]["Enums"]["period_type"]; role: string; status: string; timezone: string }>
      }
      preview_group_leaderboard_invite: {
        Args: { p_invite_code: string }
        Returns: Array<{ creator_name: string; goal_minutes: number | null; leaderboard_id: string; member_count: number; member_limit: number; name: string; period_type: Database["public"]["Enums"]["period_type"]; status: string }>
      }
      remove_group_leaderboard_member: { Args: { p_leaderboard_id: string; p_user_id: string }; Returns: undefined }
      set_project_archived: {
        Args: { p_archived: boolean; p_project_id: string }
        Returns: Database["public"]["Tables"]["projects"]["Row"]
      }
      update_my_profile: {
        Args: { p_patch: Json }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      save_session: {
        Args: {
          p_duration_mins: number
          p_ended_at: string
          p_local_date: string
          p_notes: string
          p_project_id: string
          p_started_at: string
          p_task_id: string
          p_timer_mode: string
          p_type: Database["public"]["Enums"]["session_type"]
          p_user_id: string
        }
        Returns: {
          created_at: string
          duration_mins: number
          ended_at: string
          id: string
          is_manual: boolean
          notes: string | null
          project_id: string | null
          started_at: string
          task_id: string | null
          timer_mode: Database["public"]["Enums"]["timer_mode_type"] | null
          type: Database["public"]["Enums"]["session_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      period_type: "daily" | "weekly" | "monthly" | "yearly"
      plan_interval_type: "monthly" | "annual" | "lifetime"
      plan_type: "free" | "pro" | "founding"
      session_type: "focus" | "break"
      subscription_status_type:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "expired"
        | "refunded"
      task_priority_type: "low" | "medium" | "high" | "urgent"
      task_status_type: "todo" | "in_progress" | "done"
      theme_type: "dark" | "light"
      timer_mode_type: "pomodoro" | "free"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      period_type: ["daily", "weekly", "monthly", "yearly"],
      plan_interval_type: ["monthly", "annual", "lifetime"],
      plan_type: ["free", "pro", "founding"],
      session_type: ["focus", "break"],
      subscription_status_type: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "expired",
        "refunded",
      ],
      task_priority_type: ["low", "medium", "high", "urgent"],
      task_status_type: ["todo", "in_progress", "done"],
      theme_type: ["dark", "light"],
      timer_mode_type: ["pomodoro", "free"],
    },
  },
} as const
