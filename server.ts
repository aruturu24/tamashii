import { Elysia, t } from 'elysia';
import { Database } from 'bun:sqlite';

// Initialize SQLite database
const db = new Database('abatx.db', { create: true });

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerName TEXT,
        characterName TEXT,
        occupation TEXT,
        age INTEGER,
        sex TEXT,
        residence TEXT,
        birthplace TEXT,
        characteristics TEXT,  -- JSON string
        skills TEXT,           -- JSON string
        hitPoints INTEGER,
        sanity INTEGER,
        luck INTEGER,
        magicPoints INTEGER,
        backstory TEXT,
        inventory TEXT,         -- JSON string
        creditLevel INTEGER,
        money INTEGER
    );
`);

// Type definitions remain the same
interface Character {
  id?: number;
  playerName: string;
  characterName: string;
  occupation: string;
  age: number;
  sex: string;
  residence: string;
  birthplace: string;
  characteristics: {
    STR: number;
    CON: number;
    SIZ: number;
    DEX: number;
    APP: number;
    INT: number;
    POW: number;
    EDU: number;
  };
  skills: Record<string, number>;
  hitPoints: [number, number];  // [current, max]
  sanity: [number, number];     // [current, max]
  luck: number;
  magicPoints: [number, number];// [current, max]
  backstory: string;
  inventory: string[];
  creditLevel: number;
  money: number;
}

const characterSchema = t.Object({
  playerName: t.String(),
  characterName: t.String(),
  occupation: t.String(),
  age: t.Number(),
  sex: t.String(),
  residence: t.String(),
  birthplace: t.String(),
  characteristics: t.Object({
    STR: t.Number(),
    CON: t.Number(),
    SIZ: t.Number(),
    DEX: t.Number(),
    APP: t.Number(),
    INT: t.Number(),
    POW: t.Number(),
    EDU: t.Number()
  }),
  skills: t.Record(t.String(), t.Number()),
  hitPoints: t.Tuple([t.Number(), t.Number()]),
  sanity: t.Tuple([t.Number(), t.Number()]),
  luck: t.Number(),
  magicPoints: t.Tuple([t.Number(), t.Number()]),
  backstory: t.String(),
  inventory: t.Array(t.String()),
  creditLevel: t.Number(),
  money: t.Number()
})

const app = new Elysia()
  // Serve static files
  .get('/', () => Bun.file('views/index.html'))
  .get('/add', () => Bun.file('views/add.html'))
  .get('/character/:id', () => Bun.file('views/character.html'))
  // Create character
  .post('/characters', ({ body }) => {
    const character = body as Character;

    const query = db.prepare(`
            INSERT INTO characters (
                playerName, characterName, occupation, age, sex, residence, birthplace,
                characteristics, skills, hitPoints, sanity, luck, magicPoints, backstory, inventory,
                creditLevel, money
            ) VALUES (
                $playerName, $characterName, $occupation, $age, $sex, $residence, $birthplace,
                $characteristics, $skills, $hitPoints, $sanity, $luck, $magicPoints, $backstory, $inventory,
                $creditLevel, $money
            )
        `);

    const result = query.run({
      $playerName: character.playerName,
      $characterName: character.characterName,
      $occupation: character.occupation,
      $age: character.age,
      $sex: character.sex,
      $residence: character.residence,
      $birthplace: character.birthplace,
      $characteristics: JSON.stringify(character.characteristics),
      $skills: JSON.stringify(character.skills),
      $hitPoints: JSON.stringify(character.hitPoints),
      $sanity: JSON.stringify(character.sanity),
      $luck: character.luck,
      $magicPoints: JSON.stringify(character.magicPoints),
      $backstory: character.backstory,
      $inventory: JSON.stringify(character.inventory),
      $creditLevel: character.creditLevel,
      $money: character.money
    });

    return { id: result.lastInsertRowid };
  }, {
    body: characterSchema,
  })
  // List all characters view
  .get('/characters', () => {
    const query = db.prepare('SELECT id, playerName, characterName, occupation FROM characters');
    const characters = query.all();
    return characters;
  })
  // Get character
  .get('/characters/:id', ({ params: { id } }) => {
    const query = db.prepare('SELECT * FROM characters WHERE id = $id');
    const character = query.get({ $id: id }) as {
      id: number;
      playerName: string;
      characteristics: string;
      skills: string;
      inventory: string;
      hitPoints: string;
      sanity: string;
      magicPoints: string;
      // ... other fields
    };

    if (!character) {
      throw new Error('Character not found');
    }
    // Parse JSON strings and cast to appropriate types
    const parsedCharacter = {
      ...character,
      characteristics: JSON.parse(character.characteristics as string) as Record<string, number>,
      skills: JSON.parse(character.skills as string) as Record<string, number>,
      inventory: JSON.parse(character.inventory as string) as string[],
      hitPoints: JSON.parse(character.hitPoints as string) as [number, number],
      sanity: JSON.parse(character.sanity as string) as [number, number],
      magicPoints: JSON.parse(character.magicPoints as string) as [number, number],
    };

    return parsedCharacter;
  })
  // Update character
  .put('/characters/:id', ({ params: { id }, body }) => {
    const character: Character = body;

    const query = db.prepare(`
            UPDATE characters SET
                playerName = $playerName,
                characterName = $characterName,
                occupation = $occupation,
                age = $age,
                sex = $sex,
                residence = $residence,
                birthplace = $birthplace,
                characteristics = $characteristics,
                skills = $skills,
                hitPoints = $hitPoints,
                sanity = $sanity,
                luck = $luck,
                magicPoints = $magicPoints,
                backstory = $backstory,
                inventory = $inventory,
                creditLevel = $creditLevel,
                money = $money
            WHERE id = $id
        `);

    const result = query.run({
      $id: id,
      $playerName: character.playerName,
      $characterName: character.characterName,
      $occupation: character.occupation,
      $age: character.age,
      $sex: character.sex,
      $residence: character.residence,
      $birthplace: character.birthplace,
      $characteristics: JSON.stringify(character.characteristics),
      $skills: JSON.stringify(character.skills),
      $hitPoints: JSON.stringify(character.hitPoints),
      $sanity: JSON.stringify(character.sanity),
      $luck: character.luck,
      $magicPoints: JSON.stringify(character.magicPoints),
      $backstory: character.backstory,
      $inventory: JSON.stringify(character.inventory),
      $creditLevel: character.creditLevel,
      $money: character.money
    });

    if (result.changes === 0) {
      throw new Error('Character not found');
    }

    return { success: true };
  }, {
    body: characterSchema,
  })
  // Delete character
  .delete('/characters/:id', ({ params: { id } }) => {
    const query = db.prepare('DELETE FROM characters WHERE id = $id');
    const result = query.run({ $id: id });

    if (result.changes === 0) {
      throw new Error('Character not found');
    }

    return { success: true };
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);