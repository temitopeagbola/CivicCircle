import type { Category, ReportStatus, Role } from '@civiccircle/shared';

/** Demo area: around London Bridge, Southwark. The app's map defaults here. */
export const DEMO_CENTER = { lat: 51.5033, lng: -0.0866 };

export interface SeedUser {
  id: string;
  displayName: string;
  role: Role;
  isDemo: boolean;
}

export const SEED_USERS: SeedUser[] = [
  { id: 'demo-resident', displayName: 'Alex (demo)', role: 'resident', isDemo: true },
  { id: 'demo-moderator', displayName: 'Sam (demo moderator)', role: 'moderator', isDemo: true },
  { id: 'seed-priya', displayName: 'Priya K.', role: 'resident', isDemo: false },
  { id: 'seed-tom', displayName: 'Tom W.', role: 'resident', isDemo: false },
  { id: 'seed-jordan', displayName: 'Jordan B.', role: 'resident', isDemo: false },
  { id: 'seed-mei', displayName: 'Mei L.', role: 'resident', isDemo: false },
  { id: 'seed-chidi', displayName: 'Chidi O.', role: 'resident', isDemo: false },
];

export interface SeedReport {
  id: string;
  author: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  daysAgo: number;
  /** Sanity check: the mock classifier must agree, or the seed fails loudly. */
  expectedCategory: Category;
  upvotes: number;
  /** Status changes after "open", in order, each by the demo moderator. */
  history?: { status: ReportStatus; note?: string; hoursLater: number }[];
  comments?: { author: string; body: string; hoursLater: number }[];
}

export const SEED_REPORTS: SeedReport[] = [
  {
    id: 'seed-01',
    author: 'seed-priya',
    description:
      'Deep pothole in the cycle lane on Tooley Street outside the station. Cyclists are swerving into traffic to avoid it and it fills with water when it rains.',
    address: 'Tooley Street, SE1',
    lat: 51.5049,
    lng: -0.0858,
    daysAgo: 6,
    expectedCategory: 'roads',
    upvotes: 14,
    history: [
      {
        status: 'acknowledged',
        note: 'Passed to the highways team for inspection.',
        hoursLater: 20,
      },
    ],
    comments: [
      {
        author: 'seed-tom',
        body: 'Nearly came off my bike here on Monday. Glad someone reported it.',
        hoursLater: 3,
      },
      { author: 'seed-mei', body: 'It is even worse after last night’s rain.', hoursLater: 30 },
      {
        author: 'demo-moderator',
        body: 'Thanks all, an inspector is booked for this week.',
        hoursLater: 44,
      },
    ],
  },
  {
    id: 'seed-02',
    author: 'demo-resident',
    description:
      'Large pothole on the Tooley Street cycle lane near the station entrance. Nearly came off my bike this morning.',
    address: 'Tooley Street, SE1',
    lat: 51.5052,
    lng: -0.0853,
    daysAgo: 2,
    expectedCategory: 'roads',
    upvotes: 3,
  },
  {
    id: 'seed-03',
    author: 'seed-jordan',
    description:
      'Streetlight out along the Snowsfields footpath. The path is pitch black after 6pm and lots of people use it to get home from the station.',
    address: 'Snowsfields, SE1',
    lat: 51.5023,
    lng: -0.0855,
    daysAgo: 9,
    expectedCategory: 'lighting',
    upvotes: 9,
    history: [
      { status: 'acknowledged', hoursLater: 10 },
      { status: 'in_progress', note: 'Replacement lamp ordered.', hoursLater: 50 },
    ],
    comments: [
      {
        author: 'seed-chidi',
        body: 'My daughter walks this way from school. Please fix soon.',
        hoursLater: 5,
      },
    ],
  },
  {
    id: 'seed-04',
    author: 'seed-tom',
    description:
      'Fly-tipped mattress and bin bags dumped under the railway arch on Druid Street. The bags have split and rubbish is spreading across the pavement.',
    address: 'Druid Street, SE1',
    lat: 51.501,
    lng: -0.0778,
    daysAgo: 1,
    expectedCategory: 'waste',
    upvotes: 6,
    comments: [{ author: 'seed-priya', body: 'Same spot as last month.', hoursLater: 2 }],
  },
  {
    id: 'seed-05',
    author: 'seed-mei',
    description:
      'Fresh graffiti tags sprayed across the shutters of the empty shop on Bermondsey Street. Some of it is offensive.',
    address: 'Bermondsey Street, SE1',
    lat: 51.4995,
    lng: -0.0812,
    daysAgo: 14,
    expectedCategory: 'graffiti',
    upvotes: 4,
    history: [
      { status: 'acknowledged', hoursLater: 6 },
      { status: 'resolved', note: 'Removal team cleaned the shutters.', hoursLater: 70 },
    ],
  },
  {
    id: 'seed-06',
    author: 'seed-chidi',
    description:
      'Blocked drain on Long Lane means the whole crossing floods every time it rains. Pedestrians have to walk in the road to get around it.',
    address: 'Long Lane, SE1',
    lat: 51.499,
    lng: -0.088,
    daysAgo: 4,
    expectedCategory: 'water',
    upvotes: 11,
    history: [{ status: 'acknowledged', hoursLater: 12 }],
    comments: [
      {
        author: 'demo-resident',
        body: 'Had to wade through it with a buggy yesterday.',
        hoursLater: 8,
      },
    ],
  },
  {
    id: 'seed-07',
    author: 'seed-priya',
    description:
      'Large branch hanging off a tree over the playground in Potters Fields Park. Looks like it could fall on children at any moment.',
    address: 'Potters Fields Park, SE1',
    lat: 51.504,
    lng: -0.078,
    daysAgo: 3,
    expectedCategory: 'parks',
    upvotes: 17,
    history: [
      { status: 'acknowledged', hoursLater: 2 },
      { status: 'in_progress', note: 'Area taped off; tree surgeon attending.', hoursLater: 6 },
    ],
    comments: [
      { author: 'seed-jordan', body: 'Thanks for taping it off so quickly.', hoursLater: 9 },
      { author: 'seed-tom', body: 'Can the other trees be checked too?', hoursLater: 26 },
    ],
  },
  {
    id: 'seed-08',
    author: 'seed-jordan',
    description:
      'Pedestrian crossing signal on Borough High Street is stuck on red. It is dangerous, people are crossing against the lights in heavy traffic.',
    address: 'Borough High Street, SE1',
    lat: 51.503,
    lng: -0.0905,
    daysAgo: 1,
    expectedCategory: 'traffic',
    upvotes: 8,
  },
  {
    id: 'seed-09',
    author: 'demo-resident',
    description:
      'Raised paving slabs outside the bus stop on Union Street. A wheelchair user got stuck here yesterday and it is a trip hazard for everyone.',
    address: 'Union Street, SE1',
    lat: 51.5037,
    lng: -0.0975,
    daysAgo: 5,
    expectedCategory: 'pavements',
    upvotes: 12,
    comments: [{ author: 'seed-mei', body: 'I tripped here too. Upvoted.', hoursLater: 12 }],
  },
  {
    id: 'seed-10',
    author: 'seed-mei',
    description:
      'Overflowing bins at the bus stop on Southwark Street. Rubbish has not been collected for over a week and is attracting foxes.',
    address: 'Southwark Street, SE1',
    lat: 51.505,
    lng: -0.096,
    daysAgo: 12,
    expectedCategory: 'waste',
    upvotes: 5,
    history: [{ status: 'resolved', note: 'Collected and bin schedule fixed.', hoursLater: 30 }],
  },
  {
    id: 'seed-11',
    author: 'seed-tom',
    description:
      'Street light on Park Street flickers on and off all night. Minor, but annoying for the flats opposite.',
    address: 'Park Street, SE1',
    lat: 51.5065,
    lng: -0.0935,
    daysAgo: 7,
    expectedCategory: 'lighting',
    upvotes: 2,
  },
  {
    id: 'seed-12',
    author: 'seed-chidi',
    description:
      'Water leaking from a pipe under the pavement on Weston Street. There is a constant stream running into the gutter.',
    address: 'Weston Street, SE1',
    lat: 51.5005,
    lng: -0.0845,
    daysAgo: 8,
    expectedCategory: 'water',
    upvotes: 7,
    history: [{ status: 'acknowledged', note: 'Reported to the water company.', hoursLater: 18 }],
  },
  {
    id: 'seed-13',
    author: 'seed-priya',
    description:
      'Sinkhole opening up in the road on Great Guildford Street. The tarmac has collapsed around a manhole cover and cars are driving round it.',
    address: 'Great Guildford Street, SE1',
    lat: 51.5046,
    lng: -0.0948,
    daysAgo: 2,
    expectedCategory: 'roads',
    upvotes: 21,
    history: [
      { status: 'acknowledged', hoursLater: 1 },
      { status: 'in_progress', note: 'Road closed; emergency repair under way.', hoursLater: 3 },
    ],
    comments: [
      {
        author: 'seed-jordan',
        body: 'Saw the barriers go up, thanks for the quick response.',
        hoursLater: 5,
      },
    ],
  },
  {
    id: 'seed-14',
    author: 'seed-jordan',
    description:
      'Graffiti on the railway bridge on Crucifix Lane has come back. Small tags have reappeared on the brickwork.',
    address: 'Crucifix Lane, SE1',
    lat: 51.5018,
    lng: -0.08,
    daysAgo: 10,
    expectedCategory: 'graffiti',
    upvotes: 1,
  },
  {
    id: 'seed-15',
    author: 'seed-mei',
    description:
      'Dropped kerb at the crossing on Tower Bridge Road is blocked by a broken bollard. Pram and wheelchair users cannot get onto the crossing.',
    address: 'Tower Bridge Road, SE1',
    lat: 51.4985,
    lng: -0.078,
    daysAgo: 3,
    expectedCategory: 'pavements',
    upvotes: 6,
  },
  {
    id: 'seed-16',
    author: 'seed-tom',
    description:
      'Benches in Leathermarket Gardens have been smashed and the grass is covered in broken glass.',
    address: 'Leathermarket Gardens, SE1',
    lat: 51.4993,
    lng: -0.085,
    daysAgo: 5,
    expectedCategory: 'parks',
    upvotes: 4,
    history: [{ status: 'acknowledged', hoursLater: 20 }],
  },
];
