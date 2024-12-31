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

## Game State Machine

The game follows a finite state machine (FSM) pattern with six possible states and various transitions between them. The diagram below illustrates the game flow:

```mermaid
stateDiagram
    RS: Red Spymaster
    RO: Red Operative
    BS: Blue Spymaster
    BO: Blue Operative
    RW: Red Win
    BW: Blue Win

    note right of RO
        State info:
        - Number of remaining related words
        - Card values, color assignment, and revealed status
    end note

    RS --> RO: gives clue (set guesses = number + 1)
    RS --> BS: time elapsed
    RO --> BW: picks assassin
    RO --> RW: red cards empty
    RO --> BS: neutral word OR opposing word OR guesses < 0 OR time elapsed
    RO --> RO: correct guess (decrement guesses)

    BS --> BO: gives clue (set guesses = number + 1)
    BS --> RS: time elapsed
    BO --> RW: picks assassin
    BO --> BW: blue cards empty
    BO --> RS: neutral word OR opposing word OR guesses < 0 OR time elapsed
    BO --> BO: correct guess (decrement guesses)
```

The game alternates between Spymaster and Operative turns for each team. State transitions are listed in descending order of precedence. Operative states track specific information, like the number of remaining related words and the hidden/revealed card statuses. After each operative state, the revealed card statuses are updated.

## Technologies Used

### Frontend
- **Next.js** - React framework providing:
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
   # Using Session Pooler (port 5432) for optimal IPv4 compatibility and Prisma support
   # This provides a good balance between connection management and feature support
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
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
