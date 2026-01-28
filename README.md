# The Observatory — Fox Analytics

The Observatory is a standalone debugging and analytics dashboard for [The Fox](https://github.com/jonorri/thefox_xcode2) AI audio guide. It visualizes the entire decision-making pipeline, from GPS location to content candidate scoring and final LLM execution.

![Observatory Screenshot](https://via.placeholder.com/800x400?text=Observatory+Dashboard)

## Features

- **🔭 Pipeline Visualization**: See exactly why The Curator selected specific content. View all candidates, their scores, and distance metrics.
- **⚡️ Real-time Feed**: Watch events stream in live via Supabase Realtime as users (or simulators) move through the world.
- **🧬 Session Inspection**: Deep dive into individual sessions. See device info, app version, and the exact configuration (persona, lyricism weights) used.
- **🧠 Brain Debugging**: Inspect the raw context and prompt payload sent to Gemini.

## Getting Started

The Observatory is a standard **Next.js** application. You can run it entirely independently of the iOS codebase.

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd observatory
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Ensure you have a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   *(Note: These are pre-configured in the repository for the dev environment)*

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

5. **Open Dashboard:**
   Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

- **`/app`**: Next.js App Router pages
  - **`page.tsx`**: Sessions list & Stats
  - **`sessions/[id]/page.tsx`**: Single session detail (Timeline)
  - **`events/page.tsx`**: Real-time event feed
  - **`globals.css`**: Global styles & CSS variables
- **`/lib`**: Shared utilities
  - **`supabase.ts`**: Supabase client & TypeScript types

## Data Model

The dashboard reads from two main Supabase tables:

1. **`fox_sessions`**:
   - `id`: Session UUID
   - `started_at` / `ended_at`
   - `settings`: JSON blob of Voice Persona, Lyricism, and Scoring Weights

2. **`fox_events`**:
   - `event_type`: `pipeline`, `user_feedback`, `error`
   - `candidates`: JSON array of all scored content items
   - `winner_*`: Details about the selected content
   - `payload`: Rich metadata including POI count and Gemini context preview

## Working with Antigravity

This project is designed to be worked on simultaneously with the iOS app. You can open `observatory/` as a root folder in your editor to focus purely on dashboard features.
