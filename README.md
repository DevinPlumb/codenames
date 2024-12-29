# Codenames

A real-time multiplayer implementation of the popular board game Codenames, built with Next.js, TailwindCSS, Prisma, and Supabase. Players join as either Spymasters or Field Operatives on red or blue teams to compete in this word-guessing game.

## What is Codenames?

Codenames is a word-guessing game where two teams (red and blue) compete to identify their team's cards while avoiding the assassin card. Each team has:

- A **Spymaster** who can see all card colors and gives one-word clues
- **Field Operatives** who try to guess their team's cards based on the clues

The Spymaster gives a one-word clue followed by a number, indicating how many cards relate to that clue. Teams take turns guessing until they either:
- Find all their cards (win)
- Select the assassin card (instant loss)
- Select the other team's card (turn ends)
- Select a neutral card (turn ends)
- Choose to end their turn

## Technologies Used

### Frontend
- **Next.js+** - React framework providing:
  - Server-side rendering
  - API routes
  - File-based routing
  - Built-in TypeScript support

- **TailwindCSS** - Utility-first CSS framework
  - Custom theme configuration
  - Responsive design
  - Dark mode by default
  - Custom animations

### Backend & Database
- **Supabase** - PostgreSQL database with authentication
  - User management
  - Session handling
  - Real-time capabilities
  - Row level security

- **Prisma** - Type-safe ORM
  - Schema definition
  - Database migrations
  - Automatic type generation
  - Query building

## Local Development Setup

1. **Prerequisites**
   - Node.js 18+ (use nvm with provided .nvmrc)
   - npm or yarn
   - Git

2. **Clone and Install**
   ```bash
   git clone https://github.com/DevinPlumb/codenames.git
   cd codenames
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000)
