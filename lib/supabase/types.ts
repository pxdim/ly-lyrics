/**
 * Supabase Database Types
 *
 * Run `supabase gen types typescript --project-id YOUR_PROJECT_ID` to generate
 * This is a manual definition based on our schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      songs: {
        Row: {
          id: string;
          title: string;
          artist: string | null;
          lyrics: string; // JSON stringified array
          lrc_timestamps: string | null; // JSON stringified array
          language: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist?: string | null;
          lyrics: string;
          lrc_timestamps?: string | null;
          language?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string | null;
          lyrics?: string;
          lrc_timestamps?: string | null;
          language?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      playlists: {
        Row: {
          id: string;
          name: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      playlist_songs: {
        Row: {
          id: string;
          playlist_id: string;
          song_id: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          song_id: string;
          order_index: number;
        };
        Update: {
          id?: string;
          playlist_id?: string;
          song_id?: string;
          order_index?: number;
        };
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          display_lines: number;
          theme: string;
          font_size: number;
          font_family: string;
          show_background: boolean;
          background_color: string;
          text_color: string;
          highlight_color: string;
          auto_scroll: boolean;
          scroll_duration: number;
          enable_animation: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_lines?: number;
          theme?: string;
          font_size?: number;
          font_family?: string;
          show_background?: boolean;
          background_color?: string;
          text_color?: string;
          highlight_color?: string;
          auto_scroll?: boolean;
          scroll_duration?: number;
          enable_animation?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_lines?: number;
          theme?: string;
          font_size?: number;
          font_family?: string;
          show_background?: boolean;
          background_color?: string;
          text_color?: string;
          highlight_color?: string;
          auto_scroll?: boolean;
          scroll_duration?: number;
          enable_animation?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
