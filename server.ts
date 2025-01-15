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
        money INTEGER
    );
`);

// Add this after the characters table creation
db.exec(`
    CREATE TABLE IF NOT EXISTS dice_rolls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        roll_type TEXT,          -- e.g., "skill", "luck", "damage"
        roll_value INTEGER,      -- The actual rolled number
        target_value INTEGER,    -- The target number (if applicable)
        success BOOLEAN,         -- Whether the roll was successful
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES characters(id)
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
  money: number;
}

// Add this interface near the Character interface
interface DiceRoll {
  character_id?: number;
  roll_type: string;
  roll_value: number;
  target_value?: number;
  success?: boolean;
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
  money: t.Number()
})

const diceRollSchema = t.Object({
  character_id: t.Optional(t.Number()),
  roll_type: t.String(),
  roll_value: t.Number(),
  target_value: t.Optional(t.Number()),
  success: t.Optional(t.Boolean())
});

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
                money
            ) VALUES (
                $playerName, $characterName, $occupation, $age, $sex, $residence, $birthplace,
                $characteristics, $skills, $hitPoints, $sanity, $luck, $magicPoints, $backstory, $inventory,
                $money
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
  // Add this endpoint after the existing endpoints
  .post('/dice-rolls', ({ body }) => {
    const roll = body as DiceRoll;
    if (!roll.character_id) {
      throw new Error('Character ID is required');
    }

    const query = db.prepare(`
        INSERT INTO dice_rolls (
            character_id, roll_type, roll_value, target_value, success
        ) VALUES (
            $character_id, $roll_type, $roll_value, $target_value, $success
        )
    `);

    const result = query.run(
      roll.character_id || null,
      roll.roll_type!,
      roll.roll_value!,
      roll.target_value || null,
      roll.success || null
    );

    return { id: result.lastInsertRowid };
  }, {
    body: diceRollSchema
  })
  // Add this endpoint to get roll history for a character
  .get('/dice-rolls/:character_id', ({ params: { character_id } }) => {
    const query = db.prepare('SELECT * FROM dice_rolls WHERE character_id = $character_id ORDER BY timestamp DESC');
    const rolls = query.all({ $character_id: character_id });
    return rolls;
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);