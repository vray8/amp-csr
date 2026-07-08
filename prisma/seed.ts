import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { AccountStatus, SubscriptionStatus } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

// ---------------------------------------------------------------------------
// Deterministic fixtures — no faker, no Math.random(). All variation is
// derived from array-index arithmetic. All dates are anchored to a fixed
// constant so reruns produce byte-identical data.
// ---------------------------------------------------------------------------

const ANCHOR = new Date('2026-07-01T00:00:00.000Z');

function daysBefore(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function monthsBefore(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

function monthYearLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const FIRST_NAMES = [
  'Alice', 'Brian', 'Carla', 'Derek', 'Elena', 'Felix', 'Grace', 'Hassan',
  'Isla', 'Jamal', 'Kayla', 'Liam', 'Maria', 'Noah', 'Olivia', 'Priya',
  'Quinn', 'Rosa', 'Sam', 'Tara', 'Umar', 'Vera', 'Wyatt', 'Ximena', 'Yusuf',
];

// Deliberately fewer surnames than users so at least two users share one
// (guarantees the "search demo" acceptance criterion by construction).
const LAST_NAMES = [
  'Johnson', 'Kim', 'Nguyen', 'Smith', 'Garcia', 'Patel', 'Brown', 'Davis',
  'Martinez', 'Lee', 'Wilson', 'Clark', 'Rodriguez', 'Lewis', 'Walker',
  'Young', 'King', 'Wright',
];

const CAR_MODELS: Array<[string, string]> = [
  ['Toyota', 'Camry'], ['Honda', 'Civic'], ['Ford', 'F-150'], ['Tesla', 'Model 3'],
  ['Chevrolet', 'Malibu'], ['Nissan', 'Altima'], ['BMW', '3 Series'], ['Subaru', 'Outback'],
  ['Hyundai', 'Elantra'], ['Kia', 'Sportage'], ['Mazda', 'CX-5'], ['Jeep', 'Grand Cherokee'],
  ['Volkswagen', 'Jetta'], ['Audi', 'A4'], ['Lexus', 'RX'], ['Dodge', 'Charger'],
  ['GMC', 'Sierra'], ['Chrysler', '300'], ['Volvo', 'XC60'], ['Acura', 'MDX'],
];

const COLORS = [
  'Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Beige', 'Maroon', 'Navy',
];

const PLATE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O, matches real-world plate rules

function licensePlate(n: number): string {
  const digit = (n % 9) + 1;
  const l1 = PLATE_LETTERS[(n * 7 + 1) % PLATE_LETTERS.length];
  const l2 = PLATE_LETTERS[(n * 13 + 3) % PLATE_LETTERS.length];
  const l3 = PLATE_LETTERS[(n * 19 + 5) % PLATE_LETTERS.length];
  const digits = 100 + ((n * 91 + 37) % 900);
  return `${digit}${l1}${l2}${l3}${digits}`;
}

const FAILURE_REASONS = [
  'Card declined — insufficient funds',
  'Card expired',
  'Bank declined transaction',
  'Payment method removed',
];

const PAYMENT_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Discover'];

type PlanDef = { name: string; priceCents: number; description: string };
const PLAN_DEFS: PlanDef[] = [
  { name: 'Basic', priceCents: 999, description: 'One wash per month at any participating location.' },
  { name: 'Premium', priceCents: 1999, description: 'Unlimited standard washes plus monthly interior vacuum.' },
  { name: 'Ultimate', priceCents: 2999, description: 'Unlimited deluxe washes, waxing, and priority scheduling.' },
];

const ACCOUNT_STATUS_FOR_INDEX = (i: number): AccountStatus => {
  if (i < 18) return 'ACTIVE';
  if (i < 22) return 'OVERDUE';
  return 'CANCELLED';
};

async function main() {
  console.log(`Seeding against ${process.env['DATABASE_URL']?.replace(/:[^:@]*@/, ':***@')}`);

  // -- Idempotent reset, FK-safe order ---------------------------------------
  await prisma.purchase.deleteMany();
  await prisma.subscriptionTransfer.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();

  // -- Plans ------------------------------------------------------------------
  const plans = [];
  for (const def of PLAN_DEFS) {
    plans.push(await prisma.plan.create({ data: def }));
  }
  const planByName = Object.fromEntries(plans.map((p) => [p.name, p]));

  // -- Users --------------------------------------------------------------
  const USER_COUNT = 25;
  const users = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const status = ACCOUNT_STATUS_FOR_INDEX(i);
    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `+1-202-555-${String(100 + i).padStart(4, '0')}`,
        status,
        paymentMethodBrand: PAYMENT_BRANDS[i % PAYMENT_BRANDS.length],
        paymentMethodLast4: String(1000 + ((i * 37) % 9000)).slice(-4),
      },
    });
    users.push(user);
  }

  // -- Vehicles -------------------------------------------------------------
  // Global vehicle counter feeds the license-plate generator so plates stay
  // unique across every vehicle, including users with more than one car.
  let vehicleSeq = 0;
  const nextPlate = () => licensePlate(vehicleSeq++);

  function makeVehicleData(userIdx: number, variantOffset: number) {
    const [make, model] = CAR_MODELS[(userIdx + variantOffset) % CAR_MODELS.length];
    return {
      make,
      model,
      year: 2016 + ((userIdx + variantOffset) % 9),
      color: COLORS[(userIdx + variantOffset) % COLORS.length],
      licensePlate: nextPlate(),
    };
  }

  // primaryVehicle[i] = the vehicle used for the user's main subscription.
  const primaryVehicleByUser = new Map<number, Awaited<ReturnType<typeof prisma.vehicle.create>>>();
  // secondaryVehicle[i] = an extra, subscription-less (or transferred-from) vehicle.
  const secondaryVehicleByUser = new Map<number, Awaited<ReturnType<typeof prisma.vehicle.create>>>();

  for (let i = 0; i < USER_COUNT; i++) {
    const user = users[i];
    const primary = await prisma.vehicle.create({
      data: { ...makeVehicleData(i, 0), userId: user.id },
    });
    primaryVehicleByUser.set(i, primary);

    // User 0: "transfer demo target" — two vehicles, exactly one active sub,
    // no pre-existing transfer (a live demo target for a CSR call).
    // User 1: already has a historical transfer on record.
    if (i === 0 || i === 1) {
      const secondary = await prisma.vehicle.create({
        data: { ...makeVehicleData(i, 7), userId: user.id },
      });
      secondaryVehicleByUser.set(i, secondary);
    }
  }

  // -- Subscriptions + purchases ---------------------------------------------
  // "A couple" of purchases across the whole dataset get flipped to REFUNDED
  // after generation (user indices chosen up front, deterministically).
  const REFUND_TARGETS = new Set([5, 12]);

  let overdueCount = 0;
  let cancelledSubCount = 0;
  let transferRowsCreated = 0;

  for (let i = 0; i < USER_COUNT; i++) {
    const user = users[i];
    const plan = plans[i % plans.length];
    const accountStatus = user.status as AccountStatus;

    // Vehicle assignment + subscription status per scenario.
    let vehicle = primaryVehicleByUser.get(i)!;
    let subStatus: SubscriptionStatus = 'ACTIVE';
    let cancelledAt: Date | null = null;
    let nextBillingDate: Date | null = monthsBefore(ANCHOR, -1); // ~1 month from anchor
    let startedAt: Date;
    let monthsActive = 3 + (i % 4); // 3-6 monthly payments
    const washes = (i % 3) + 1; // 1-3 scattered single washes (never zero, so every subscribed user clears the 3-purchase floor)

    if (accountStatus === 'OVERDUE') {
      subStatus = 'OVERDUE';
      nextBillingDate = daysBefore(ANCHOR, 5 + (i % 5)); // billing date already passed
      monthsActive = 3 + (i % 2); // 3-4
    } else if (accountStatus === 'CANCELLED') {
      subStatus = 'CANCELLED';
      cancelledAt = daysBefore(ANCHOR, 20 + i * 5);
      nextBillingDate = null;
      monthsActive = 2 + (i % 3); // 2-4
    }

    let transferHistory: { fromVehicleId: string; toVehicleId: string; transferredAt: Date } | null = null;

    if (i === 1) {
      // Historical transfer: subscription started on the secondary (old)
      // vehicle and was moved to the primary (current) vehicle in the past.
      const oldVehicle = secondaryVehicleByUser.get(1)!;
      startedAt = monthsBefore(ANCHOR, monthsActive);
      const transferredAt = monthsBefore(ANCHOR, Math.max(1, monthsActive - 2));
      transferHistory = {
        fromVehicleId: oldVehicle.id,
        toVehicleId: vehicle.id,
        transferredAt,
      };
    } else {
      startedAt = monthsBefore(ANCHOR, monthsActive);
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        vehicleId: vehicle.id,
        planId: plan.id,
        status: subStatus,
        startedAt,
        cancelledAt,
        nextBillingDate,
      },
    });

    if (transferHistory) {
      await prisma.subscriptionTransfer.create({
        data: {
          subscriptionId: subscription.id,
          fromVehicleId: transferHistory.fromVehicleId,
          toVehicleId: transferHistory.toVehicleId,
          transferredAt: transferHistory.transferredAt,
        },
      });
      transferRowsCreated++;
    }

    if (subStatus === 'OVERDUE') overdueCount++;
    if (subStatus === 'CANCELLED') cancelledSubCount++;

    // -- Purchases for this user -------------------------------------------
    const purchases: Array<{
      type: 'SINGLE_WASH' | 'SUBSCRIPTION_PAYMENT';
      status: 'PAID' | 'FAILED' | 'REFUNDED';
      amountCents: number;
      description: string;
      subscriptionId: string | null;
      failureReason: string | null;
      createdAt: Date;
    }> = [];

    // Monthly subscription payments, oldest to newest, aligned to startedAt.
    for (let m = 0; m < monthsActive; m++) {
      const paymentDate = monthsBefore(ANCHOR, monthsActive - 1 - m);
      const isLastMonth = m === monthsActive - 1;
      const isFailedPayment = accountStatus === 'OVERDUE' && isLastMonth;

      purchases.push({
        type: 'SUBSCRIPTION_PAYMENT',
        status: isFailedPayment ? 'FAILED' : 'PAID',
        amountCents: plan.priceCents,
        description: `${plan.name} Monthly — ${monthYearLabel(paymentDate)}`,
        subscriptionId: subscription.id,
        failureReason: isFailedPayment ? FAILURE_REASONS[i % FAILURE_REASONS.length] : null,
        createdAt: paymentDate,
      });
    }

    // Scattered single washes across the same window.
    for (let w = 0; w < washes; w++) {
      const washDate = daysBefore(ANCHOR, 10 + w * 23 + (i % 7) * 3);
      const isDeluxe = (i + w) % 2 === 0;
      purchases.push({
        type: 'SINGLE_WASH',
        status: 'PAID',
        amountCents: isDeluxe ? 2500 : 1500,
        description: isDeluxe ? 'Single Wash — Deluxe' : 'Single Wash — Standard',
        subscriptionId: null,
        failureReason: null,
        createdAt: washDate,
      });
    }

    if (REFUND_TARGETS.has(i) && purchases.length > 0) {
      // Flip the most recent PAID purchase to REFUNDED for this user.
      for (let p = purchases.length - 1; p >= 0; p--) {
        if (purchases[p].status === 'PAID') {
          purchases[p] = { ...purchases[p], status: 'REFUNDED' };
          break;
        }
      }
    }

    for (const purchase of purchases) {
      await prisma.purchase.create({
        data: {
          userId: user.id,
          type: purchase.type,
          status: purchase.status,
          amountCents: purchase.amountCents,
          description: purchase.description,
          subscriptionId: purchase.subscriptionId,
          failureReason: purchase.failureReason,
          createdAt: purchase.createdAt,
        },
      });
    }
  }

  console.log(`Seed complete: ${users.length} users, ${plans.length} plans, ${vehicleSeq} vehicles.`);
  console.log(`OVERDUE subscriptions: ${overdueCount}, CANCELLED subscriptions: ${cancelledSubCount}, transfer rows: ${transferRowsCreated}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
