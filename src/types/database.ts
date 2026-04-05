// Auto-generated Supabase types placeholder.
// Replace with output of: npx supabase gen types typescript --project-id <id> --schema public
// Once your Supabase project is configured.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Language = {
  flag_emoji: string
  language_code: string
  language_name: string
}

export type Testimonial = {
  quote: string
  name: string
  role?: string
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          stripe_account_id: string | null
          stripe_account_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          stripe_account_id?: string | null
          stripe_account_active?: boolean
          created_at?: string
        }
        Update: {
          display_name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          stripe_account_id?: string | null
          stripe_account_active?: boolean
        }
        Relationships: []
      }
      communities: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          category: string | null
          cover_image_url: string | null
          created_by: string
          price_monthly: number
          stripe_price_id: string | null
          is_anonymous_enabled: boolean
          languages: Language[] | null
          lp_what_youll_get: string[] | null
          lp_creator_photo_url: string | null
          lp_creator_bio: string | null
          lp_creator_achievements: string[] | null
          lp_testimonials: Testimonial[] | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_by: string
          price_monthly?: number
          stripe_price_id?: string | null
          is_anonymous_enabled?: boolean
          languages?: Language[] | null
          lp_what_youll_get?: string[] | null
          lp_creator_photo_url?: string | null
          lp_creator_bio?: string | null
          lp_creator_achievements?: string[] | null
          lp_testimonials?: Testimonial[] | null
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          category?: string | null
          cover_image_url?: string | null
          price_monthly?: number
          stripe_price_id?: string | null
          is_anonymous_enabled?: boolean
          languages?: Language[] | null
          lp_what_youll_get?: string[] | null
          lp_creator_photo_url?: string | null
          lp_creator_bio?: string | null
          lp_creator_achievements?: string[] | null
          lp_testimonials?: Testimonial[] | null
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          user_id: string
          role: 'admin' | 'member'
          can_pin: boolean
          joined_at: string
        }
        Insert: {
          community_id: string
          user_id: string
          role?: 'admin' | 'member'
          can_pin?: boolean
          joined_at?: string
        }
        Update: {
          role?: 'admin' | 'member'
          can_pin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      memberships: {
        Row: {
          id: string
          community_id: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: 'active' | 'cancelled' | 'past_due'
          current_period_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status?: 'active' | 'cancelled' | 'past_due'
          current_period_end?: string | null
          created_at?: string
        }
        Update: {
          status?: 'active' | 'cancelled' | 'past_due'
          current_period_end?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: string
          community_id: string
          channel_id: string | null
          root_message: string
          created_by: string
          is_anonymous_topic: boolean
          last_activity_at: string
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          channel_id?: string | null
          root_message: string
          created_by: string
          is_anonymous_topic?: boolean
          last_activity_at?: string
          created_at?: string
        }
        Update: {
          is_anonymous_topic?: boolean
          last_activity_at?: string
          channel_id?: string | null
        }
        Relationships: []
      }
      channel_sections: {
        Row: {
          id: string
          community_id: string
          name: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          name: string
          position?: number
          created_at?: string
        }
        Update: {
          name?: string
          position?: number
        }
        Relationships: []
      }
      channels: {
        Row: {
          id: string
          community_id: string
          section_id: string | null
          name: string
          description: string | null
          icon_emoji: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          section_id?: string | null
          name: string
          description?: string | null
          icon_emoji?: string
          position?: number
          created_at?: string
        }
        Update: {
          section_id?: string | null
          name?: string
          description?: string | null
          icon_emoji?: string
          position?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          topic_id: string
          user_id: string
          content: string
          is_anonymous: boolean
          reply_to_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          user_id: string
          content: string
          is_anonymous?: boolean
          reply_to_id?: string | null
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          emoji?: string
        }
        Relationships: []
      }
      pinned_topics: {
        Row: {
          topic_id: string
          community_id: string
          pinned_by: string
          pinned_at: string
        }
        Insert: {
          topic_id: string
          community_id: string
          pinned_by: string
          pinned_at?: string
        }
        Update: {
          pinned_at?: string
        }
        Relationships: []
      }
      topic_reads: {
        Row: {
          topic_id: string
          user_id: string
          last_read_at: string
        }
        Insert: {
          topic_id: string
          user_id: string
          last_read_at?: string
        }
        Update: {
          last_read_at?: string
        }
        Relationships: []
      }
      topic_anonymous_identities: {
        Row: {
          topic_id: string
          user_id: string
          pseudonym: string
          created_at: string
        }
        Insert: {
          topic_id: string
          user_id: string
          pseudonym: string
          created_at?: string
        }
        Update: {
          pseudonym?: string
        }
        Relationships: []
      }
      topic_follows: {
        Row: {
          topic_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          topic_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          created_at?: string
        }
        Relationships: []
      }
      cohort_alumni: {
        Row: {
          id: string
          community_id: string
          name: string
          cohort_name: string | null
          achievement: string | null
          linkedin_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          name: string
          cohort_name?: string | null
          achievement?: string | null
          linkedin_url?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          cohort_name?: string | null
          achievement?: string | null
          linkedin_url?: string | null
        }
        Relationships: []
      }
      session_types: {
        Row: {
          id: string
          creator_id: string
          community_id: string
          title: string
          type: 'one_on_one' | 'group'
          duration_minutes: number
          price: number
          capacity: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          community_id: string
          title: string
          type: 'one_on_one' | 'group'
          duration_minutes: number
          price: number
          capacity?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          type?: 'one_on_one' | 'group'
          duration_minutes?: number
          price?: number
          capacity?: number | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "session_types_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          }
        ]
      }
      slots: {
        Row: {
          id: string
          session_type_id: string
          start_time: string
          status: 'available' | 'booked' | 'cancelled'
          booked_count: number
          created_at: string
        }
        Insert: {
          id?: string
          session_type_id: string
          start_time: string
          status?: 'available' | 'booked' | 'cancelled'
          booked_count?: number
          created_at?: string
        }
        Update: {
          status?: 'available' | 'booked' | 'cancelled'
          booked_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "slots_session_type_id_fkey"
            columns: ["session_type_id"]
            isOneToOne: false
            referencedRelation: "session_types"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          slot_id: string
          user_id: string
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          amount_paid: number
          platform_fee: number
          status: 'confirmed' | 'cancelled' | 'refunded'
          created_at: string
        }
        Insert: {
          id?: string
          slot_id: string
          user_id: string
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount_paid: number
          platform_fee: number
          status?: 'confirmed' | 'cancelled' | 'refunded'
          created_at?: string
        }
        Update: {
          status?: 'confirmed' | 'cancelled' | 'refunded'
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          community_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          price: number
          stripe_price_id: string | null
          position: number
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          price?: number
          stripe_price_id?: string | null
          position?: number
          is_published?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          cover_image_url?: string | null
          price?: number
          stripe_price_id?: string | null
          position?: number
          is_published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "courses_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          }
        ]
      }
      course_modules: {
        Row: {
          id: string
          course_id: string
          title: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          position?: number
          created_at?: string
        }
        Update: {
          title?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      course_lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          content: string | null
          video_url: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          content?: string | null
          video_url?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          title?: string
          content?: string | null
          video_url?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          }
        ]
      }
      course_downloads: {
        Row: {
          id: string
          course_id: string
          title: string
          url: string
          file_type: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          url: string
          file_type?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          title?: string
          url?: string
          file_type?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_downloads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      course_enrollments: {
        Row: {
          id: string
          course_id: string
          user_id: string
          stripe_checkout_session_id: string | null
          amount_paid: number
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          stripe_checkout_session_id?: string | null
          amount_paid?: number
          created_at?: string
        }
        Update: {
          amount_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_community_member: {
        Args: { cid: string }
        Returns: boolean
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
