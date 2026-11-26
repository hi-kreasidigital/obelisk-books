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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          company: string | null
          country: string
          created_at: string
          customer_id: string
          full_name: string
          id: string
          is_default: boolean
          line1: string
          line2: string | null
          phone: string | null
          postal_code: string | null
          region: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          city: string
          company?: string | null
          country: string
          created_at?: string
          customer_id: string
          full_name: string
          id?: string
          is_default?: boolean
          line1: string
          line2?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          city?: string
          company?: string | null
          country?: string
          created_at?: string
          customer_id?: string
          full_name?: string
          id?: string
          is_default?: boolean
          line1?: string
          line2?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      article_books: {
        Row: {
          article_id: string
          book_id: string
          position: number
        }
        Insert: {
          article_id: string
          book_id: string
          position: number
        }
        Update: {
          article_id?: string
          book_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_books_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      article_categories: {
        Row: {
          article_id: string
          category_id: string
        }
        Insert: {
          article_id: string
          category_id: string
        }
        Update: {
          article_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_categories_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      article_translations: {
        Row: {
          article_id: string
          body_html: string | null
          body_json: Json | null
          complete: boolean
          excerpt: string | null
          lang: string
          reading_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          article_id: string
          body_html?: string | null
          body_json?: Json | null
          complete?: boolean
          excerpt?: string | null
          lang: string
          reading_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          article_id?: string
          body_html?: string | null
          body_json?: Json | null
          complete?: boolean
          excerpt?: string | null
          lang?: string
          reading_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_translations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "article_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          cover_media_id: string | null
          created_at: string
          id: string
          publish_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
          wix_url: string | null
        }
        Insert: {
          author_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          id?: string
          publish_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          wix_url?: string | null
        }
        Update: {
          author_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          id?: string
          publish_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          wix_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      author_translations: {
        Row: {
          author_id: string
          bio: string | null
          complete: boolean
          lang: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_id: string
          bio?: string | null
          complete?: boolean
          lang: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_id?: string
          bio?: string | null
          complete?: boolean
          lang?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "author_translations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "author_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      authors: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_media_id: string | null
          sort: number
          sort_name: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
          website_url: string | null
          wix_slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photo_media_id?: string | null
          sort?: number
          sort_name: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          wix_slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_media_id?: string | null
          sort?: number
          sort_name?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          wix_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authors_photo_media_id_fkey"
            columns: ["photo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      book_categories: {
        Row: {
          book_id: string
          category_id: string
        }
        Insert: {
          book_id: string
          category_id: string
        }
        Update: {
          book_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_categories_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      book_contributors: {
        Row: {
          author_id: string
          book_id: string
          position: number
          role: Database["public"]["Enums"]["contributor_role"]
        }
        Insert: {
          author_id: string
          book_id: string
          position?: number
          role?: Database["public"]["Enums"]["contributor_role"]
        }
        Update: {
          author_id?: string
          book_id?: string
          position?: number
          role?: Database["public"]["Enums"]["contributor_role"]
        }
        Relationships: [
          {
            foreignKeyName: "book_contributors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_contributors_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_gallery: {
        Row: {
          book_id: string
          media_id: string
          position: number
        }
        Insert: {
          book_id: string
          media_id: string
          position: number
        }
        Update: {
          book_id?: string
          media_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_gallery_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_gallery_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      book_translations: {
        Row: {
          book_id: string
          complete: boolean
          description: string | null
          lang: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          book_id: string
          complete?: boolean
          description?: string | null
          lang: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          book_id?: string
          complete?: boolean
          description?: string | null
          lang?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_translations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "book_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      books: {
        Row: {
          collection_id: string | null
          collection_position: number | null
          cover_media_id: string | null
          created_at: string
          featured: boolean
          id: string
          internal_title: string
          publication_date: string | null
          publish_at: string | null
          publisher: string
          retailer_links: Json
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          text_language: string
          updated_at: string
          updated_by: string | null
          wix_slugs: string[]
        }
        Insert: {
          collection_id?: string | null
          collection_position?: number | null
          cover_media_id?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          internal_title: string
          publication_date?: string | null
          publish_at?: string | null
          publisher?: string
          retailer_links?: Json
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          text_language?: string
          updated_at?: string
          updated_by?: string | null
          wix_slugs?: string[]
        }
        Update: {
          collection_id?: string | null
          collection_position?: number | null
          cover_media_id?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          internal_title?: string
          publication_date?: string | null
          publish_at?: string | null
          publisher?: string
          retailer_links?: Json
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          text_language?: string
          updated_at?: string
          updated_by?: string | null
          wix_slugs?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "books_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      bookvault_events: {
        Row: {
          actor_user_id: string | null
          error: string | null
          event_type: string
          id: number
          payload: Json
          pod_ref: string | null
          processed_at: string | null
          received_at: string
          shipment_id: string | null
          signature_valid: boolean | null
          source: string
        }
        Insert: {
          actor_user_id?: string | null
          error?: string | null
          event_type: string
          id?: never
          payload?: Json
          pod_ref?: string | null
          processed_at?: string | null
          received_at?: string
          shipment_id?: string | null
          signature_valid?: boolean | null
          source: string
        }
        Update: {
          actor_user_id?: string | null
          error?: string | null
          event_type?: string
          id?: never
          payload?: Json
          pod_ref?: string | null
          processed_at?: string | null
          received_at?: string
          shipment_id?: string | null
          signature_valid?: boolean | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookvault_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "print_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookvault_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "print_shipments_overdue"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_format_id: string
          member_format_id: string
          position: number
        }
        Insert: {
          bundle_format_id: string
          member_format_id: string
          position: number
        }
        Update: {
          bundle_format_id?: string
          member_format_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_format_id_fkey"
            columns: ["bundle_format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_member_format_id_fkey"
            columns: ["member_format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_media_id: string | null
          sort: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
          wix_slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_media_id?: string | null
          sort?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          wix_slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_media_id?: string | null
          sort?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          wix_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          complete: boolean
          intro: string | null
          lang: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id: string
          complete?: boolean
          intro?: string | null
          lang: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string
          complete?: boolean
          intro?: string | null
          lang?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "category_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      collection_translations: {
        Row: {
          collection_id: string
          complete: boolean
          intro: string | null
          lang: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          collection_id: string
          complete?: boolean
          intro?: string | null
          lang: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          collection_id?: string
          complete?: boolean
          intro?: string | null
          lang?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_translations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "collection_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      collections: {
        Row: {
          cover_media_id: string | null
          created_at: string
          id: string
          sort: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
          wix_slug: string | null
        }
        Insert: {
          cover_media_id?: string | null
          created_at?: string
          id?: string
          sort?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          wix_slug?: string | null
        }
        Update: {
          cover_media_id?: string | null
          created_at?: string
          id?: string
          sort?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
          wix_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          anonymised_at: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          preferred_currency: string | null
          preferred_lang: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          anonymised_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_lang?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          anonymised_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_lang?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_preferred_lang_fkey"
            columns: ["preferred_lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "customers_preferred_lang_fkey"
            columns: ["preferred_lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      discount_codes: {
        Row: {
          assigned_email: string | null
          code: string
          created_at: string
          discount_id: string
          id: string
          single_use: boolean
          uses: number
        }
        Insert: {
          assigned_email?: string | null
          code: string
          created_at?: string
          discount_id: string
          id?: string
          single_use?: boolean
          uses?: number
        }
        Update: {
          assigned_email?: string | null
          code?: string
          created_at?: string
          discount_id?: string
          id?: string
          single_use?: boolean
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_redemptions: {
        Row: {
          amount_cents: number
          code_id: string | null
          created_at: string
          discount_id: string | null
          id: string
          order_id: string
        }
        Insert: {
          amount_cents: number
          code_id?: string | null
          created_at?: string
          discount_id?: string | null
          id?: string
          order_id: string
        }
        Update: {
          amount_cents?: number
          code_id?: string | null
          created_at?: string
          discount_id?: string | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_targets: {
        Row: {
          discount_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          discount_id: string
          target_id: string
          target_type: string
        }
        Update: {
          discount_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_targets_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          active: boolean
          allowed_emails: string[]
          amount_eur_cents: number | null
          amount_usd_cents: number | null
          applies_to: Database["public"]["Enums"]["discount_scope"]
          created_at: string
          ends_at: string | null
          first_order_only: boolean
          id: string
          kind: Database["public"]["Enums"]["discount_kind"]
          max_uses: number | null
          max_uses_per_customer: number | null
          min_subtotal_eur_cents: number | null
          min_subtotal_usd_cents: number | null
          name: string
          percent: number | null
          rule: Json
          signed_in_only: boolean
          stackable_with_code: boolean
          starts_at: string | null
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          allowed_emails?: string[]
          amount_eur_cents?: number | null
          amount_usd_cents?: number | null
          applies_to?: Database["public"]["Enums"]["discount_scope"]
          created_at?: string
          ends_at?: string | null
          first_order_only?: boolean
          id?: string
          kind: Database["public"]["Enums"]["discount_kind"]
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_subtotal_eur_cents?: number | null
          min_subtotal_usd_cents?: number | null
          name: string
          percent?: number | null
          rule?: Json
          signed_in_only?: boolean
          stackable_with_code?: boolean
          starts_at?: string | null
          type: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          allowed_emails?: string[]
          amount_eur_cents?: number | null
          amount_usd_cents?: number | null
          applies_to?: Database["public"]["Enums"]["discount_scope"]
          created_at?: string
          ends_at?: string | null
          first_order_only?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["discount_kind"]
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_subtotal_eur_cents?: number | null
          min_subtotal_usd_cents?: number | null
          name?: string
          percent?: number | null
          rule?: Json
          signed_in_only?: boolean
          stackable_with_code?: boolean
          starts_at?: string | null
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ebook_entitlements: {
        Row: {
          created_at: string
          customer_id: string | null
          download_limit: number
          downloads_epub: number
          downloads_pdf: number
          format_id: string | null
          id: string
          order_item_id: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          download_limit?: number
          downloads_epub?: number
          downloads_pdf?: number
          format_id?: string | null
          id?: string
          order_item_id: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          download_limit?: number
          downloads_epub?: number
          downloads_pdf?: number
          format_id?: string | null
          id?: string
          order_item_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ebook_entitlements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebook_entitlements_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebook_entitlements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      formats: {
        Row: {
          availability: Database["public"]["Enums"]["availability"]
          book_id: string | null
          bookvault_sku: string | null
          bundle_of: Database["public"]["Enums"]["set_type"] | null
          collection_id: string | null
          created_at: string
          ebook_epub_path: string | null
          ebook_pdf_path: string | null
          height_mm: number | null
          id: string
          isbn13: string | null
          pages: number | null
          preview_generated_at: string | null
          preview_page_count: number
          preview_page_from: number
          preview_source: string | null
          price_eur_cents: number
          price_usd_cents: number
          release_date: string | null
          sale_ends_at: string | null
          sale_price_eur_cents: number | null
          sale_price_usd_cents: number | null
          sale_starts_at: string | null
          sort: number
          stripe_tax_code: string | null
          type: Database["public"]["Enums"]["format_type"]
          updated_at: string
          updated_by: string | null
          weight_g: number | null
          width_mm: number | null
        }
        Insert: {
          availability?: Database["public"]["Enums"]["availability"]
          book_id?: string | null
          bookvault_sku?: string | null
          bundle_of?: Database["public"]["Enums"]["set_type"] | null
          collection_id?: string | null
          created_at?: string
          ebook_epub_path?: string | null
          ebook_pdf_path?: string | null
          height_mm?: number | null
          id?: string
          isbn13?: string | null
          pages?: number | null
          preview_generated_at?: string | null
          preview_page_count?: number
          preview_page_from?: number
          preview_source?: string | null
          price_eur_cents: number
          price_usd_cents: number
          release_date?: string | null
          sale_ends_at?: string | null
          sale_price_eur_cents?: number | null
          sale_price_usd_cents?: number | null
          sale_starts_at?: string | null
          sort?: number
          stripe_tax_code?: string | null
          type: Database["public"]["Enums"]["format_type"]
          updated_at?: string
          updated_by?: string | null
          weight_g?: number | null
          width_mm?: number | null
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability"]
          book_id?: string | null
          bookvault_sku?: string | null
          bundle_of?: Database["public"]["Enums"]["set_type"] | null
          collection_id?: string | null
          created_at?: string
          ebook_epub_path?: string | null
          ebook_pdf_path?: string | null
          height_mm?: number | null
          id?: string
          isbn13?: string | null
          pages?: number | null
          preview_generated_at?: string | null
          preview_page_count?: number
          preview_page_from?: number
          preview_source?: string | null
          price_eur_cents?: number
          price_usd_cents?: number
          release_date?: string | null
          sale_ends_at?: string | null
          sale_price_eur_cents?: number | null
          sale_price_usd_cents?: number | null
          sale_starts_at?: string | null
          sort?: number
          stripe_tax_code?: string | null
          type?: Database["public"]["Enums"]["format_type"]
          updated_at?: string
          updated_by?: string | null
          weight_g?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "formats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formats_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_tiles: {
        Row: {
          id: string
          media_id: string
          position: number
          post_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          media_id: string
          position: number
          post_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          media_id?: string
          position?: number
          post_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_tiles_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          enabled: boolean
          is_default: boolean
          name_en: string
          native_name: string
          notes: string | null
          sort: number
          updated_at: string
          updated_by: string | null
          url_prefix: string
        }
        Insert: {
          code: string
          enabled?: boolean
          is_default?: boolean
          name_en: string
          native_name: string
          notes?: string | null
          sort?: number
          updated_at?: string
          updated_by?: string | null
          url_prefix: string
        }
        Update: {
          code?: string
          enabled?: boolean
          is_default?: boolean
          name_en?: string
          native_name?: string
          notes?: string | null
          sort?: number
          updated_at?: string
          updated_by?: string | null
          url_prefix?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          format_id: string
          list_id: string
          pinned: boolean
          position: number
        }
        Insert: {
          format_id: string
          list_id: string
          pinned?: boolean
          position: number
        }
        Update: {
          format_id?: string
          list_id?: string
          pinned?: boolean
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "list_items_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      list_translations: {
        Row: {
          lang: string
          list_id: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          lang: string
          list_id: string
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          lang?: string
          list_id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "list_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "list_translations_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          id: string
          key: string
          max_items: number
          mode: Database["public"]["Enums"]["list_mode"]
          rule: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          max_items?: number
          mode?: Database["public"]["Enums"]["list_mode"]
          rule?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          max_items?: number
          mode?: Database["public"]["Enums"]["list_mode"]
          rule?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          alt: Json
          blur_path: string | null
          bucket: string
          bytes: number | null
          caption: Json
          created_at: string
          height: number | null
          id: string
          mime: string
          path: string
          updated_at: string
          updated_by: string | null
          width: number | null
        }
        Insert: {
          alt?: Json
          blur_path?: string | null
          bucket: string
          bytes?: number | null
          caption?: Json
          created_at?: string
          height?: number | null
          id?: string
          mime: string
          path: string
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Update: {
          alt?: Json
          blur_path?: string | null
          bucket?: string
          bytes?: number | null
          caption?: Json
          created_at?: string
          height?: number | null
          id?: string
          mime?: string
          path?: string
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          data: Json
          id: number
          order_id: string
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          data?: Json
          id?: never
          order_id: string
          type: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          data?: Json
          id?: never
          order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          bookvault_sku: string | null
          created_at: string
          discount_cents: number
          format_id: string | null
          format_type: Database["public"]["Enums"]["format_type"]
          id: string
          isbn13: string | null
          order_id: string
          parent_item_id: string | null
          quantity: number
          title: string
          unit_price_cents: number
        }
        Insert: {
          bookvault_sku?: string | null
          created_at?: string
          discount_cents?: number
          format_id?: string | null
          format_type: Database["public"]["Enums"]["format_type"]
          id?: string
          isbn13?: string | null
          order_id: string
          parent_item_id?: string | null
          quantity?: number
          title: string
          unit_price_cents?: number
        }
        Update: {
          bookvault_sku?: string | null
          created_at?: string
          discount_cents?: number
          format_id?: string | null
          format_type?: Database["public"]["Enums"]["format_type"]
          id?: string
          isbn13?: string | null
          order_id?: string
          parent_item_id?: string | null
          quantity?: number
          title?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          currency: string
          customer_id: string | null
          discount_cents: number
          ebook_consent_at: string | null
          email: string
          id: string
          is_historic: boolean
          lang: string
          lookup_token_hash: string | null
          notes: string | null
          number: number
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json | null
          shipping_cents: number
          shipping_option_id: string | null
          shipping_snapshot: Json | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          currency: string
          customer_id?: string | null
          discount_cents?: number
          ebook_consent_at?: string | null
          email: string
          id?: string
          is_historic?: boolean
          lang?: string
          lookup_token_hash?: string | null
          notes?: string | null
          number?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_option_id?: string | null
          shipping_snapshot?: Json | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_cents?: number
          ebook_consent_at?: string | null
          email?: string
          id?: string
          is_historic?: boolean
          lang?: string
          lookup_token_hash?: string | null
          notes?: string | null
          number?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_option_id?: string | null
          shipping_snapshot?: Json | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_shipping_option_id_fkey"
            columns: ["shipping_option_id"]
            isOneToOne: false
            referencedRelation: "shipping_options"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_pages: {
        Row: {
          format_id: string
          height: number | null
          page_no: number
          path: string
          width: number | null
        }
        Insert: {
          format_id: string
          height?: number | null
          page_no: number
          path: string
          width?: number | null
        }
        Update: {
          format_id?: string
          height?: number | null
          page_no?: number
          path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preview_pages_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          format_id: string
          id: number
          price_eur_cents: number
          price_usd_cents: number
          sale_ends_at: string | null
          sale_price_eur_cents: number | null
          sale_price_usd_cents: number | null
          sale_starts_at: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          format_id: string
          id?: never
          price_eur_cents: number
          price_usd_cents: number
          sale_ends_at?: string | null
          sale_price_eur_cents?: number | null
          sale_price_usd_cents?: number | null
          sale_starts_at?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          format_id?: string
          id?: never
          price_eur_cents?: number
          price_usd_cents?: number
          sale_ends_at?: string | null
          sale_price_eur_cents?: number | null
          sale_price_usd_cents?: number | null
          sale_starts_at?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
        ]
      }
      print_shipment_items: {
        Row: {
          order_item_id: string
          quantity: number
          shipment_id: string
        }
        Insert: {
          order_item_id: string
          quantity: number
          shipment_id: string
        }
        Update: {
          order_item_id?: string
          quantity?: number
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_shipment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "print_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "print_shipments_overdue"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      print_shipments: {
        Row: {
          bookvault_pod_ref: string | null
          carrier: string | null
          created_at: string
          has_tracking: boolean
          id: string
          is_preorder_followup: boolean
          order_id: string
          problem_note: string | null
          release_date: string | null
          reprint_of_id: string | null
          sent_at: string | null
          sent_via: string | null
          shipped_at: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bookvault_pod_ref?: string | null
          carrier?: string | null
          created_at?: string
          has_tracking?: boolean
          id?: string
          is_preorder_followup?: boolean
          order_id: string
          problem_note?: string | null
          release_date?: string | null
          reprint_of_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bookvault_pod_ref?: string | null
          carrier?: string | null
          created_at?: string
          has_tracking?: boolean
          id?: string
          is_preorder_followup?: boolean
          order_id?: string
          problem_note?: string | null
          release_date?: string | null
          reprint_of_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_shipments_reprint_of_id_fkey"
            columns: ["reprint_of_id"]
            isOneToOne: false
            referencedRelation: "print_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_shipments_reprint_of_id_fkey"
            columns: ["reprint_of_id"]
            isOneToOne: false
            referencedRelation: "print_shipments_overdue"
            referencedColumns: ["shipment_id"]
          },
        ]
      }
      publish_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          github_run_url: string | null
          id: string
          message: string | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          github_run_url?: string | null
          id?: string
          message?: string | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          github_run_url?: string | null
          id?: string
          message?: string | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      related_articles: {
        Row: {
          article_id: string
          book_id: string
          position: number
        }
        Insert: {
          article_id: string
          book_id: string
          position: number
        }
        Update: {
          article_id?: string
          book_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "related_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_articles_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      related_books: {
        Row: {
          book_id: string
          position: number
          related_book_id: string
        }
        Insert: {
          book_id: string
          position: number
          related_book_id: string
        }
        Update: {
          book_id?: string
          position?: number
          related_book_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "related_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_books_related_book_id_fkey"
            columns: ["related_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          is_public: boolean
          key: string
          note: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      shipping_options: {
        Row: {
          active: boolean
          bookvault_service_code: string | null
          carrier: string
          created_at: string
          delivery_max_days: number
          delivery_min_days: number
          extra_item_eur_cents: number
          extra_item_usd_cents: number
          id: string
          price_eur_cents: number
          price_usd_cents: number
          region_id: string
          service_name: string
          sort: number
          source_note: string | null
          tracked: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          bookvault_service_code?: string | null
          carrier: string
          created_at?: string
          delivery_max_days: number
          delivery_min_days: number
          extra_item_eur_cents?: number
          extra_item_usd_cents?: number
          id?: string
          price_eur_cents: number
          price_usd_cents: number
          region_id: string
          service_name: string
          sort?: number
          source_note?: string | null
          tracked?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          bookvault_service_code?: string | null
          carrier?: string
          created_at?: string
          delivery_max_days?: number
          delivery_min_days?: number
          extra_item_eur_cents?: number
          extra_item_usd_cents?: number
          id?: string
          price_eur_cents?: number
          price_usd_cents?: number
          region_id?: string
          service_name?: string
          sort?: number
          source_note?: string | null
          tracked?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_options_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "shipping_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_regions: {
        Row: {
          countries: string[]
          id: string
          name: string
          sort: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          countries: string[]
          id?: string
          name: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          countries?: string[]
          id?: string
          name?: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          display_name: string
          email: string
          invited_by: string | null
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          display_name: string
          email: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          display_name?: string
          email?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      text_keys: {
        Row: {
          created_at: string
          key: string
          max_length: number | null
          needs_confirm: boolean
          note: string | null
          placeholders: string[]
          removed_at: string | null
          section_no: number
          section_title: string
          sort: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          key: string
          max_length?: number | null
          needs_confirm?: boolean
          note?: string | null
          placeholders?: string[]
          removed_at?: string | null
          section_no: number
          section_title: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          max_length?: number | null
          needs_confirm?: boolean
          note?: string | null
          placeholders?: string[]
          removed_at?: string | null
          section_no?: number
          section_title?: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      text_translations: {
        Row: {
          key: string
          lang: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          lang: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          lang?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "text_translations_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "text_keys"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "text_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_completeness"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "text_translations_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      language_completeness: {
        Row: {
          articles_done: number | null
          articles_total: number | null
          authors_done: number | null
          authors_total: number | null
          books_done: number | null
          books_total: number | null
          categories_done: number | null
          categories_total: number | null
          code: string | null
          collections_done: number | null
          collections_total: number | null
          enabled: boolean | null
          sort: number | null
          text_done: number | null
          text_total: number | null
        }
        Relationships: []
      }
      print_shipments_overdue: {
        Row: {
          business_days: number | null
          order_id: string | null
          order_number: number | null
          overdue_type: string | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["shipment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "print_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      business_days_between: { Args: { a: string; b: string }; Returns: number }
      current_price_cents: {
        Args: { at?: string; currency: string; f: string }
        Returns: number
      }
      is_live: {
        Args: {
          publish_at: string
          s: Database["public"]["Enums"]["content_status"]
        }
        Returns: boolean
      }
      lowest_price_30d: {
        Args: { before?: string; currency: string; f: string }
        Returns: number
      }
      text_placeholders: { Args: { t: string }; Returns: string[] }
    }
    Enums: {
      availability: "available" | "preorder" | "out_of_print" | "hidden"
      content_status: "draft" | "published" | "hidden"
      contributor_role: "author" | "translator" | "editor" | "illustrator"
      discount_kind: "code" | "automatic"
      discount_scope:
        | "order"
        | "formats"
        | "category"
        | "collection"
        | "print"
        | "ebooks"
      discount_type:
        | "percent"
        | "fixed"
        | "free_shipping"
        | "free_ebook"
        | "free_100"
        | "buy_x_get_y"
        | "print_ebook_combo"
        | "set_price"
      format_type: "paperback" | "hardcover" | "ebook" | "bundle"
      list_mode: "manual" | "automatic" | "mixed"
      payment_status:
        | "pending"
        | "paid"
        | "free_copy"
        | "partially_refunded"
        | "refunded"
        | "failed"
        | "disputed"
      set_type: "paperback" | "hardcover" | "ebook"
      shipment_status:
        | "to_send"
        | "sent_to_bookvault"
        | "sent_to_print"
        | "printed"
        | "shipped"
        | "cancelled"
        | "on_hold"
        | "reprint"
      staff_role: "owner" | "editor" | "fulfilment"
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
    Enums: {
      availability: ["available", "preorder", "out_of_print", "hidden"],
      content_status: ["draft", "published", "hidden"],
      contributor_role: ["author", "translator", "editor", "illustrator"],
      discount_kind: ["code", "automatic"],
      discount_scope: [
        "order",
        "formats",
        "category",
        "collection",
        "print",
        "ebooks",
      ],
      discount_type: [
        "percent",
        "fixed",
        "free_shipping",
        "free_ebook",
        "free_100",
        "buy_x_get_y",
        "print_ebook_combo",
        "set_price",
      ],
      format_type: ["paperback", "hardcover", "ebook", "bundle"],
      list_mode: ["manual", "automatic", "mixed"],
      payment_status: [
        "pending",
        "paid",
        "free_copy",
        "partially_refunded",
        "refunded",
        "failed",
        "disputed",
      ],
      set_type: ["paperback", "hardcover", "ebook"],
      shipment_status: [
        "to_send",
        "sent_to_bookvault",
        "sent_to_print",
        "printed",
        "shipped",
        "cancelled",
        "on_hold",
        "reprint",
      ],
      staff_role: ["owner", "editor", "fulfilment"],
    },
  },
} as const
