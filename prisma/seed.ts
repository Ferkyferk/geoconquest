import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Test users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      provider: 'google',
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      provider: 'google',
    },
  })

  const carol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: {
      email: 'carol@example.com',
      name: 'Carol',
      provider: 'apple',
    },
  })

  // Game sessions
  const today = new Date().toISOString().split('T')[0]

  for (const [user, score, countries, multiplier, streak] of [
    [alice, 4200, ['US', 'CA', 'MX', 'GT', 'BZ'], 3.0, 5],
    [bob, 3100, ['DE', 'FR', 'NL', 'BE'], 2.0, 3],
    [carol, 5800, ['BR', 'AR', 'CL', 'BO', 'PY', 'UY', 'PE'], 4.0, 7],
  ] as const) {
    await prisma.gameSession.create({
      data: {
        userId: (user as { id: string }).id,
        date: today,
        score: score as number,
        countriesConquered: JSON.stringify(countries),
        continentsConquered: 1,
        livesRemaining: 3,
        maxMultiplier: multiplier as number,
        maxStreak: streak as number,
      },
    })
  }

  // Daily scores
  await prisma.dailyScore.upsert({
    where: { userId_date: { userId: alice.id, date: today } },
    update: {},
    create: { userId: alice.id, date: today, score: 4200, rank: 2 },
  })
  await prisma.dailyScore.upsert({
    where: { userId_date: { userId: bob.id, date: today } },
    update: {},
    create: { userId: bob.id, date: today, score: 3100, rank: 3 },
  })
  await prisma.dailyScore.upsert({
    where: { userId_date: { userId: carol.id, date: today } },
    update: {},
    create: { userId: carol.id, date: today, score: 5800, rank: 1 },
  })

  // Friendship
  await prisma.friendship.upsert({
    where: { userId_friendId: { userId: alice.id, friendId: bob.id } },
    update: {},
    create: { userId: alice.id, friendId: bob.id, status: 'accepted' },
  })
  await prisma.friendship.upsert({
    where: { userId_friendId: { userId: bob.id, friendId: alice.id } },
    update: {},
    create: { userId: bob.id, friendId: alice.id, status: 'accepted' },
  })

  // Skill ratings
  await prisma.skillRating.upsert({
    where: { userId: alice.id },
    update: {},
    create: { userId: alice.id, rating: 1120, gamesPlayed: 14 },
  })
  await prisma.skillRating.upsert({
    where: { userId: bob.id },
    update: {},
    create: { userId: bob.id, rating: 980, gamesPlayed: 9 },
  })
  await prisma.skillRating.upsert({
    where: { userId: carol.id },
    update: {},
    create: { userId: carol.id, rating: 1250, gamesPlayed: 21 },
  })

  console.log('Seed complete:', { alice: alice.id, bob: bob.id, carol: carol.id })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
